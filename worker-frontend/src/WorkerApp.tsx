import { useState, useEffect, useRef } from 'react';
import { WorkerProfile, WorkerTransaction, ReplyMessageData, TransactionCategory } from './types/worker';
import {
  fetchWorkerTransactions,
  sendWorkerTransaction,
  updateWorkerTransactionNotes,
  deleteWorkerTransaction,
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

import { API_BASE } from './config/apiConfig';
import { getCachedTransactions, saveCachedTransactions, mergeTransactions } from './utils/chatCache';
import { playJbjNotificationSound } from './utils/soundUtils';

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

  // Pagination & Search States
  const [loadedDays, setLoadedDays] = useState(7);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isSendingRef = useRef(isSending);
  const searchQueryRef = useRef(searchQuery);
  const loadedDaysRef = useRef(loadedDays);

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
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Modal States
  const [replyTo, setReplyTo] = useState<ReplyMessageData | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<WorkerTransaction | null>(null);
  const [historyTx, setHistoryTx] = useState<WorkerTransaction | null>(null);

  // Load chat history with real-time merge & cache save
  const loadTransactions = async (daysToFetch = 7, query = '', appendEarlier = false) => {
    if (!worker?.id) return;
    const currentWorkerId = worker.id;
    try {
      const freshData = await fetchWorkerTransactions(currentWorkerId, daysToFetch, query);
      setIsOnline(true);

      setTransactions((prev) => {
        // Strictly merge transactions belonging only to currentWorkerId
        const merged = mergeTransactions(prev, freshData, currentWorkerId);

        // Chime notification trigger on new inbound Admin messages
        if (prev.length > 0 && freshData.length > prev.length) {
          const latest = freshData[freshData.length - 1];
          if (latest && latest.direction === 'OUTGOING') {
            playJbjNotificationSound();
          }
        }

        // Save merged active feed to 8-hour local storage cache
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
              setTransactions((prev) => {
                if (prev.some((t) => t.id === tx.id)) return prev;
                if (tx.direction === 'OUTGOING') {
                  playJbjNotificationSound();
                  if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                      new Notification(`📌 New Order Assigned: ${tx.item_name || 'JBJ Work'}`, {
                        body: tx.notes || 'You have received a new work assignment from JBJ.',
                        icon: tx.photos?.[0] || '/favicon.ico',
                      });
                    } catch (e) {}
                  }
                  // Instantly mark read since Worker is currently actively looking at chat screen
                  fetch(`${API_BASE}/work-assignment/worker-transactions/mark-read`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ worker_id: worker.id, direction: 'OUTGOING' }),
                  }).catch(() => {});
                }
                const updated = [...prev, tx];
                saveCachedTransactions(worker.id, updated);
                return updated;
              });
            }
          } catch (err) {
            console.warn('SSE parse error:', err);
          }
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
          if (prev.some((t) => t.id === e.detail.id)) return prev;
          if (e.detail.direction === 'OUTGOING') {
            playJbjNotificationSound();
          }
          const updated = [...prev, e.detail];
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
              if (prev.some((t) => t.id === tx.id)) return prev;
              if (tx.direction === 'OUTGOING') {
                playJbjNotificationSound();
              }
              const updated = [...prev, tx];
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
      const cached = getCachedTransactions(worker.id);
      if (cached) setTransactions(cached);
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

    // Try loading new worker's 8-hour cache or revalidate
    const cached = getCachedTransactions(profile.id);
    if (cached && cached.length > 0) {
      setTransactions(cached);
    } else {
      setLoading(true);
    }

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

  // Send message
  const handleSendMessage = async (notes: string, photos: File[]) => {
    if (!worker?.id) return;
    setIsSending(true);
    try {
      const res = await sendWorkerTransaction(worker.id, notes, photos, replyTo);
      if (res.success) {
        setReplyTo(null);
        if (res.transaction) {
          const newTx = res.transaction;
          setTransactions((prev) => {
            if (prev.some((t) => t.id === newTx.id)) return prev;
            const updated = [...prev, newTx];
            saveCachedTransactions(worker.id, updated);
            return updated;
          });
        } else {
          await loadTransactions(loadedDays, searchQuery, false);
        }
      } else {
        alert(`❌ Failed to send: ${res.message || 'Error'}`);
      }
    } catch (err: any) {
      // Append temporary local failed message to allow tap to retry
      const failedTx: WorkerTransaction = {
        id: `failed_${Date.now()}`,
        worker_id: worker.id,
        direction: 'INCOMING',
        category: 'CASH',
        photos: [],
        notes,
        created_at: new Date().toISOString(),
        status_state: 'FAILED',
      };
      setTransactions((prev) => [...prev, failedTx]);
      alert(`❌ Connection error: ${err.message}`);
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
      <WhatsAppHeader
        worker={worker}
        isOnline={isOnline}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onSearch={handleSearch}
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

      {/* Modals */}
      <NewTransactionModal
        isOpen={isSpecModalOpen}
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
