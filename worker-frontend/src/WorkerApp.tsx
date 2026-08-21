import { useState, useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { initFcmPushNotifications } from './services/fcmService';
import { WorkerProfile, WorkerTransaction, ReplyMessageData, TransactionCategory } from './types/worker';
import {
  fetchWorkerTransactions,
  sendWorkerTransaction,
  updateWorkerTransactionNotes,
  deleteWorkerTransaction,
  fetchWorkerAssignedOrders,
} from './services/workerApi';
import { WorkerLoginForm } from './components/auth/WorkerLoginForm';
import { WhatsAppHeader } from './components/chat/WhatsAppHeader';
import { WhatsAppChatArea } from './components/chat/WhatsAppChatArea';
import { WhatsAppInputBar } from './components/chat/WhatsAppInputBar';
import { ImageLightboxModal } from './components/modals/ImageLightboxModal';
import { ProfileViewModal } from './components/modals/ProfileViewModal';
import { EditMessageModal } from './components/modals/EditMessageModal';
import { EditHistoryModal } from './components/modals/EditHistoryModal';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import { WhatsAppListView } from './components/hub/WhatsAppListView';
import { WorkerOrdersView } from './components/orders/WorkerOrdersView';
import { WorkerTransactionsStatementView } from './components/ledger/WorkerTransactionsStatementView';

import { API_BASE } from './config/apiConfig';
import { mergeTransactions } from './utils/chatCache';
import {
  getCachedTransactions,
  saveCachedTransactions,
  processPendingQueue,
} from './utils/offlineQueue';
import { playJbjNotificationSound } from './utils/soundUtils';
import { initNativeNotifications, triggerDeviceNotification } from './utils/nativeNotification';

export default function WorkerApp() {
  const [worker, setWorker] = useState<WorkerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('jbj_worker_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [transactions, setTransactions] = useState<WorkerTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Navigation Channel State: 'LIST' | 'CHAT' | 'ORDERS' | 'TRANSACTIONS'
  const [activeChannel, setActiveChannel] = useState<'LIST' | 'CHAT' | 'ORDERS' | 'TRANSACTIONS'>('LIST');
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);

  // Pagination & Search States
  const [loadedDays, setLoadedDays] = useState(7);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isSendingRef = useRef(isSending);
  const searchQueryRef = useRef(searchQuery);
  const loadedDaysRef = useRef(loadedDays);

  const loadOrderCounts = () => {
    if (!worker?.id) return;
    fetchWorkerAssignedOrders(worker.id)
      .then((all) => {
        const pending = all.filter((o: any) => o.returned_from_worker !== 'yes' && o.status !== 'COMPLETED').length;
        const completed = all.filter((o: any) => o.returned_from_worker === 'yes' || o.status === 'COMPLETED').length;
        setPendingOrdersCount(pending);
        setCompletedOrdersCount(completed);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (worker?.id) {
      loadOrderCounts();
    }
  }, [worker?.id]);

  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    loadedDaysRef.current = loadedDays;
  }, [loadedDays]);

  useEffect(() => {
    initNativeNotifications();
  }, []);

  // Modal States
  const [replyTo, setReplyTo] = useState<ReplyMessageData | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<WorkerTransaction | null>(null);
  const [historyTx, setHistoryTx] = useState<WorkerTransaction | null>(null);

  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const notifyNewIncomingTransactions = (txList: WorkerTransaction[]) => {
    if (!initialLoadDoneRef.current) {
      for (const tx of txList) {
        if (tx && tx.id) notifiedMsgIdsRef.current.add(tx.id);
      }
      initialLoadDoneRef.current = true;
      return;
    }

    for (const tx of txList) {
      if (!tx || !tx.id) continue;

      if (!notifiedMsgIdsRef.current.has(tx.id)) {
        notifiedMsgIdsRef.current.add(tx.id);

        if (tx.direction === 'OUTGOING') {
          playJbjNotificationSound();
          const summaryText = tx.notes || (tx.amount_cash ? `Cash Update: ₹${tx.amount_cash.toLocaleString('en-IN')}` : tx.weight_grams ? `Metal Update: ${tx.weight_grams}g` : 'New work assignment received');
          triggerDeviceNotification('👑 Jaya Bhavani Admin', summaryText);
        }
      }
    }
  };

  // App resume & foreground sync listener
  useEffect(() => {
    let sub: any;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', (state) => {
        if (state.isActive && worker?.id) {
          loadTransactions(loadedDaysRef.current, searchQueryRef.current, false);
        }
      }).then((s) => { sub = s; });
    }
    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [worker?.id]);

  // ── INDEXEDDB OFFLINE AUTO-SYNC LISTENER ──
  useEffect(() => {
    const handleOnline = async () => {
      console.log('⚡ [Worker App Online] Connection restored! Auto-syncing pending queue...');
      const { syncedCount } = await processPendingQueue(async (payload) => {
        const formData = new FormData();
        Object.keys(payload).forEach((k) => formData.append(k, payload[k]));
        const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
          method: 'POST',
          body: formData,
        });
        return await res.json();
      });
      if (syncedCount > 0 && worker?.id) {
        loadTransactions(7, '', false);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [worker?.id]);

  // Load chat history with real-time merge & cache save
  const loadTransactions = async (daysToFetch = 7, query = '', appendEarlier = false) => {
    if (!worker?.id) return;
    const currentWorkerId = worker.id;

    // 0ms instant cache load from IndexedDB
    try {
      const cached = await getCachedTransactions(currentWorkerId);
      if (cached && cached.length > 0) {
        setTransactions((prev) => mergeTransactions(prev, cached as WorkerTransaction[], currentWorkerId));
      }
    } catch {}

    try {
      const freshData = await fetchWorkerTransactions(currentWorkerId, daysToFetch, query);
      setIsOnline(true);

      setTransactions((prev) => {
        const merged = mergeTransactions(prev, freshData, currentWorkerId);
        notifyNewIncomingTransactions(merged);

        if (!query) {
          saveCachedTransactions(currentWorkerId, merged);
        }
        return merged;
      });
    } catch (err) {
      console.warn('Failed to load transactions:', err);
      setIsOnline(false);
    }
  };

  // Initial load: Fetch fresh server database transactions & mark read
  useEffect(() => {
    if (worker?.id) {
      setLoading(true);

      // Initialize native notification channel + FCM push registration together after login
      // This guarantees Android 13+ notification permission dialog is shown post-login
      initNativeNotifications().then(() => {
        initFcmPushNotifications(worker.id, 'WORKER');
      });

      // Mark Admin messages as READ when worker opens chat screen
      fetch(`${API_BASE}/work-assignment/worker-transactions/mark-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: worker.id, direction: 'OUTGOING' }),
      }).catch(() => {});

      loadTransactions(7, '', false).finally(() => setLoading(false));
    }

    // ── SERVER-SENT EVENTS (SSE) LIVE CHAT STREAM (< 10ms REAL-TIME BRIDGE) ──
    let eventSource: EventSource | null = null;
    if (worker?.id) {
      try {
        eventSource = new EventSource(`${API_BASE}/work-assignment/worker-transactions/stream?workerId=${worker.id}`);

        eventSource.addEventListener('NEW_TRANSACTION', (event: any) => {
          try {
            const tx = JSON.parse(event.data);
            if (tx && String(tx.worker_id) === String(worker.id)) {
              notifyNewIncomingTransactions([tx]);
              setTransactions((prev) => mergeTransactions(prev, [tx], worker.id));
            }
          } catch {}
        });

        eventSource.addEventListener('MARK_READ', (event: any) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && String(payload.worker_id) === String(worker.id)) {
              setTransactions((prev) => {
                const updated = prev.map((t) => {
                  const matchDir = payload.direction ? t.direction === payload.direction : true;
                  if (matchDir) {
                    return { ...t, status_state: 'READ' as const, is_seen: 'YES' as const, read_at: payload.read_at || t.read_at };
                  }
                  return t;
                });
                saveCachedTransactions(worker.id, updated);
                return updated;
              });
            }
          } catch {}
        });

        eventSource.addEventListener('MESSAGE_EDITED', (event: any) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && String(payload.worker_id) === String(worker.id)) {
              setTransactions((prev) => {
                const updated = prev.map((t) => {
                  if (t.id === payload.id) {
                    return { ...t, notes: payload.notes, edited_at_history: payload.edited_at_history };
                  }
                  return t;
                });
                saveCachedTransactions(worker.id, updated);
                return updated;
              });
            }
          } catch {}
        });

        eventSource.addEventListener('MESSAGE_DELETED', (event: any) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && String(payload.worker_id) === String(worker.id)) {
              setTransactions((prev) => {
                const updated = prev.filter((t) => t.id !== payload.id);
                saveCachedTransactions(worker.id, updated);
                return updated;
              });
            }
          } catch {}
        });
      } catch (err) {
        console.warn('EventSource connection exception:', err);
      }
    }

    const handleLocalMsg = (e: any) => {
      if (e.detail && worker?.id && String(e.detail.worker_id) === String(worker.id)) {
        setTransactions((prev) => {
          if (e.detail.direction === 'OUTGOING') {
            playJbjNotificationSound();
          }
          const updated = mergeTransactions(prev, [e.detail], worker.id);
          saveCachedTransactions(worker.id, updated);
          return updated;
        });
      }
    };
    window.addEventListener('jbj_chat_message_sent', handleLocalMsg);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('jbj_chat_channel');
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'NEW_MESSAGE' && msg.data?.transaction) {
          const tx = msg.data.transaction;
          if (worker?.id && String(tx.worker_id) === String(worker.id)) {
            setTransactions((prev) => {
              if (tx.direction === 'OUTGOING') {
                playJbjNotificationSound();
              }
              const updated = mergeTransactions(prev, [tx], worker.id);
              saveCachedTransactions(worker.id, updated);
              return updated;
            });
          }
        }
      };
    } catch {}

    return () => {
      window.removeEventListener('jbj_chat_message_sent', handleLocalMsg);
      if (channel) channel.close();
      if (eventSource) eventSource.close();
    };
  }, [worker?.id]);

  // Handle Scroll Up / Load Earlier 7 Days
  const handleLoadEarlier = async () => {
    if (!worker?.id || isLoadingEarlier) return;
    setIsLoadingEarlier(true);
    const nextDays = loadedDays + 7;
    setLoadedDays(nextDays);
    try {
      await loadTransactions(nextDays, searchQuery, true);
    } finally {
      setIsLoadingEarlier(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDirectDatabaseRefresh = async () => {
    if (!worker?.id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      // 1. Force fresh fetch from database
      const fresh = await fetchWorkerTransactions(worker.id, 60, '');
      const validTxns = Array.isArray(fresh) ? fresh.filter((t: any) => !t.is_deleted) : [];
      setTransactions(validTxns);
      await saveCachedTransactions(worker.id, validTxns);

      // 2. Fetch fresh assigned orders
      await loadOrderCounts();
    } catch (err) {
      console.warn('Direct database refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Search overall chat
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!worker?.id) return;
    if (query.trim()) {
      setLoading(true);
      fetchWorkerTransactions(worker.id, undefined, query)
        .then((res) => setTransactions(res))
        .finally(() => setLoading(false));
    } else {
      // Clear search, restore 7-day cache
      getCachedTransactions(worker.id).then((cached) => {
        if (cached && cached.length > 0) setTransactions(cached);
      });
      loadTransactions(loadedDays, '', false);
    }
  };

  const handleLoginSuccess = (profile: WorkerProfile) => {
    // Clear previous worker's chat state immediately
    setTransactions([]);
    setReplyTo(null);
    setEditingTx(null);
    setHistoryTx(null);
    setSearchQuery('');
    setLoadedDays(7);

    setWorker(profile);
    localStorage.setItem('jbj_worker_profile', JSON.stringify(profile));

    // Try loading new worker's IndexedDB cache or revalidate
    getCachedTransactions(profile.id).then((cached) => {
      if (cached && cached.length > 0) {
        setTransactions(cached);
      } else {
        setLoading(true);
      }
    });

    // Explicit fresh fetch targeting profile.id directly
    fetchWorkerTransactions(profile.id, 7)
      .then((fresh) => {
        const cleanMerged = mergeTransactions([], fresh, profile.id);
        setTransactions(cleanMerged);
        saveCachedTransactions(profile.id, cleanMerged);
      })
      .finally(() => setLoading(false));
  };

  const handleLogout = () => {
    // Purge all chat caches and profile from localStorage
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('jbj_chat_cache_') || key === 'jbj_worker_profile') {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // Reset all React state to prevent memory leak / data bleed
    setWorker(null);
    setTransactions([]);
    setReplyTo(null);
    setEditingTx(null);
    setHistoryTx(null);
    setSearchQuery('');
    setLoadedDays(7);
  };

  // Send message with Optimistic UI updates (0ms perceived latency)
  const handleSendMessage = async (notes: string, photos: File[]) => {
    if (!worker?.id) return;
    setIsSending(true);

    const currentReplyTo = replyTo;
    setReplyTo(null);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempTx: WorkerTransaction = {
      id: tempId,
      worker_id: worker.id,
      direction: 'INCOMING',
      category: 'CASH',
      photos: photos.map((f) => URL.createObjectURL(f)),
      notes,
      created_at: new Date().toISOString(),
      status_state: 'SENDING',
      reply_to: currentReplyTo,
    };

    // Instant append (0ms) & scroll to bottom
    setTransactions((prev) => {
      const updated = [...prev, tempTx];
      saveCachedTransactions(worker.id, updated);
      return updated;
    });

    try {
      const res = await sendWorkerTransaction(worker.id, notes, photos, currentReplyTo);
      if (res.success && res.transaction) {
        const confirmedTx = { ...res.transaction, status_state: res.transaction.status_state || 'DELIVERED' };
        setTransactions((prev) => {
          const filtered = prev.filter((t) => t.id !== tempId);
          const merged = mergeTransactions(filtered, [confirmedTx], worker.id);
          saveCachedTransactions(worker.id, merged);
          return merged;
        });
      } else {
        setTransactions((prev) => {
          const updated = prev.map((t) => (t.id === tempId ? { ...t, status_state: 'FAILED' as const } : t));
          saveCachedTransactions(worker.id, updated);
          return updated;
        });
      }
    } catch (err: any) {
      setTransactions((prev) => {
        const updated = prev.map((t) => (t.id === tempId ? { ...t, status_state: 'FAILED' as const } : t));
        saveCachedTransactions(worker.id, updated);
        return updated;
      });
    } finally {
      setIsSending(false);
    }
  };

  // Edit message
  const handleSaveEdit = async (txId: string, newNotes: string) => {
    try {
      const res = await updateWorkerTransactionNotes(txId, newNotes);
      if (res.success) {
        await loadTransactions(loadedDays, searchQuery, false);
      } else {
        alert(`❌ Failed to update message: ${res.message || 'Error'}`);
      }
    } catch (e: any) {
      alert(`❌ Error editing message: ${e.message}`);
    }
  };

  // Delete message
  const handleDeleteTx = async (txId: string) => {
    try {
      const res = await deleteWorkerTransaction(txId);
      if (res.success) {
        await loadTransactions(loadedDays, searchQuery, false);
      }
    } catch (e: any) {
      alert(`❌ Error deleting message: ${e.message}`);
    }
  };

  if (!worker) {
    return <WorkerLoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Send structured gold/silver/cash transaction spec
  const handleSendTransactionSpec = async (specData: {
    category: TransactionCategory;
    itemName: string;
    orderId?: string | null;
    weightGrams?: number;
    touchPercentage?: number;
    amountCash?: number;
    cashMetalLink?: 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH';
    appliedRatePerGram?: number;
    notes: string;
    photos: File[];
  }) => {
    if (!worker?.id) return;
    setIsSending(true);
    try {
      const res = await sendWorkerTransaction(worker.id, specData.notes, specData.photos, replyTo, {
        category: specData.category,
        itemName: specData.itemName,
        orderId: specData.orderId,
        weightGrams: specData.weightGrams,
        touchPercentage: specData.touchPercentage,
        amountCash: specData.amountCash,
        cashMetalLink: specData.cashMetalLink,
        appliedRatePerGram: specData.appliedRatePerGram,
      });
      if (res.success) {
        setReplyTo(null);
        await loadTransactions(loadedDays, searchQuery, false);
      } else {
        alert(`❌ Failed to send: ${res.message || 'Error'}`);
      }
    } catch (err: any) {
      alert(`❌ Connection error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="wa-app-root">
      <AppUpdateModal />

      {/* ── CHANNEL 1: WHATSAPP HUB LIST VIEW ── */}
      {activeChannel === 'LIST' && (
        <>
          <WhatsAppHeader
            worker={worker}
            isOnline={isOnline}
            onLogout={handleLogout}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSearch={handleSearch}
            onRefresh={handleDirectDatabaseRefresh}
            isRefreshing={isRefreshing}
          />
          <WhatsAppListView
            worker={worker}
            transactions={transactions}
            pendingOrdersCount={pendingOrdersCount}
            completedOrdersCount={completedOrdersCount}
            onOpenChat={() => setActiveChannel('CHAT')}
            onOpenOrders={() => setActiveChannel('ORDERS')}
            onOpenTransactions={() => setActiveChannel('TRANSACTIONS')}
          />
        </>
      )}

      {/* ── CHANNEL 2: JBJ - ADMIN LIVE CHAT ── */}
      {activeChannel === 'CHAT' && (
        <>
          <WhatsAppHeader
            worker={worker}
            isOnline={isOnline}
            onLogout={handleLogout}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSearch={handleSearch}
            onBack={() => setActiveChannel('LIST')}
            onRefresh={handleDirectDatabaseRefresh}
            isRefreshing={isRefreshing}
          />
          <WhatsAppChatArea
            transactions={transactions}
            loading={loading}
            workerId={worker.id}
            onReply={(data) => setReplyTo(data)}
            onEdit={(tx) => setEditingTx(tx)}
            onDelete={handleDeleteTx}
            onViewEditHistory={(tx) => setHistoryTx(tx)}
            onPreviewImage={(url) => setPreviewImageUrl(url)}
            onLoadEarlier={handleLoadEarlier}
            isLoadingEarlier={isLoadingEarlier}
          />
          <WhatsAppInputBar
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            onSendMessage={handleSendMessage}
            onOpenSpecModal={() => setIsSpecModalOpen(true)}
            isSending={isSending}
          />
        </>
      )}

      {/* ── CHANNEL 3: MY ORDERS (ASSIGNED TASKS) ── */}
      {activeChannel === 'ORDERS' && (
        <WorkerOrdersView
          worker={worker}
          onBack={() => {
            setActiveChannel('LIST');
            loadOrderCounts();
          }}
          onPreviewImage={(url) => setPreviewImageUrl(url)}
        />
      )}

      {/* ── CHANNEL 4: TRANSACTIONS STATEMENT (LEDGER) ── */}
      {activeChannel === 'TRANSACTIONS' && (
        <WorkerTransactionsStatementView
          worker={worker}
          transactions={transactions}
          onBack={() => setActiveChannel('LIST')}
          onPreviewImage={(url) => setPreviewImageUrl(url)}
          onRefresh={handleDirectDatabaseRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Modals */}
      <NewTransactionModal
        isOpen={isSpecModalOpen}
        workerId={worker.id}
        onClose={() => setIsSpecModalOpen(false)}
        onSubmitTransaction={async (specData) => {
          await handleSendTransactionSpec(specData);
        }}
      />

      <ImageLightboxModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      <ProfileViewModal
        worker={worker}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <EditMessageModal
        transaction={editingTx}
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        onSave={handleSaveEdit}
      />

      <EditHistoryModal
        transaction={historyTx}
        isOpen={Boolean(historyTx)}
        onClose={() => setHistoryTx(null)}
      />
    </div>
  );
}
