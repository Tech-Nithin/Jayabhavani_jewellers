import React, { useState, useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { API_BASE } from '../config/apiConfig';
import { type Language } from '../utils/translations';

import { FullImagePreviewModal } from '../inventory-frontend/components/FullImagePreviewModal';
import { convertImageToWebP, convertImageToWebPBlob, downloadImageAsJpeg } from '../utils/imageUtils';
import { playJbjNotificationSound } from '../utils/soundUtils';
import { triggerDeviceNotification } from '../utils/nativeNotification';
import { initFcmPushNotifications } from '../services/fcmService';
import { WorkerSidebar } from './components/WorkerSidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { WorkerProfileModal } from './components/WorkerProfileModal';
import { TransactionInputForm } from './components/TransactionInputForm';
import {
  saveCachedTransactions,
  getCachedTransactions,
  enqueuePendingTransaction,
  processPendingQueue,
  mergeTransactions,
} from '../utils/offlineQueue';

interface WorkerTransactionItem {
  id: string;
  worker_id: string;
  order_id?: string | null;
  direction: 'OUTGOING' | 'INCOMING';
  category: 'CASH' | 'GOLD' | 'SILVER' | 'ORNAMENT' | 'CHAT';
  amount_cash?: number;
  weight_grams?: number;
  touch_percentage?: number;
  fine_weight_grams?: number;
  item_name?: string;
  cash_metal_link?: 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH';
  applied_rate_per_gram?: number;
  equivalent_metal_grams?: number;
  photos: string[];
  notes: string;
  created_at: string;
  status_state?: 'PENDING' | 'SENDING' | 'DELIVERED' | 'READ' | 'FAILED' | string;
  is_seen?: 'YES' | 'NO' | string;
  read_at?: string | null;
  seen_at?: string | null;
  is_deleted?: boolean;
  edited_at_history?: any[];
  reply_to?: {
    id: string;
    senderName: string;
    notes: string;
    photos?: string[];
  } | null;
}

export interface ReplyMessageData {
  id: string;
  senderName: string;
  notes: string;
  photos?: string[];
}

interface WorkerTransactionsViewProps {
  worker: any;
  workers?: any[];
  onSelectWorker?: (worker: any) => void;
  onBack: () => void;
  lang?: Language;
}

const formatDateDivider = (dateStr?: string): string => {
  if (!dateStr) return '';
  const msgDate = new Date(dateStr);
  if (isNaN(msgDate.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (
    msgDate.getDate() === today.getDate() &&
    msgDate.getMonth() === today.getMonth() &&
    msgDate.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }

  if (
    msgDate.getDate() === yesterday.getDate() &&
    msgDate.getMonth() === yesterday.getMonth() &&
    msgDate.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  if (msgDate.getFullYear() === today.getFullYear()) {
    return msgDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  return msgDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const toSentenceCase = (str?: string | null): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const WorkerTransactionsView: React.FC<WorkerTransactionsViewProps> = ({
  worker: initialWorker,
  workers = [],
  onSelectWorker,
  onBack,
  lang = 'EN',
}) => {
  // Active Selected Worker State (Supports internal switching)
  const [worker, setWorker] = useState(initialWorker);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessageTimes, setLastMessageTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    setWorker(initialWorker);
  }, [initialWorker]);

  const handleWorkerChange = (w: any) => {
    setWorker(w);
    if (w?.id) {
      setUnreadCounts((prev) => ({ ...prev, [w.id]: 0 }));
      fetch(`${API_BASE}/work-assignment/worker-transactions/mark-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: w.id, direction: 'INCOMING' }),
      }).catch(() => { });
    }
    if (onSelectWorker) onSelectWorker(w);
  };

  // Periodically refresh workers' unread counts & latest message timestamps
  useEffect(() => {
    const refreshWorkerUnreadCounts = async () => {
      try {
        const res = await fetch(`${API_BASE}/work-assignment/workers`);
        const data = await res.json();
        if (data.success && Array.isArray(data.workers)) {
          const counts: Record<string, number> = {};
          const times: Record<string, string> = {};
          data.workers.forEach((w: any) => {
            if (worker?.id && String(w.id) === String(worker.id)) {
              counts[w.id] = 0;
            } else {
              counts[w.id] = w.unread_messages_count || 0;
            }
            if (w.last_message_at) {
              times[w.id] = w.last_message_at;
            }
          });
          setUnreadCounts((prev) => ({ ...prev, ...counts }));
          setLastMessageTimes((prev) => ({ ...prev, ...times }));
        }
      } catch (err) {
        // silent catch
      }
    };

    refreshWorkerUnreadCounts();
    const interval = setInterval(refreshWorkerUnreadCounts, 4000);
    return () => clearInterval(interval);
  }, [worker?.id]);

  const [transactions, setTransactions] = useState<WorkerTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // In-Chat Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  // Accordion Toggle State & Sidebar Collapse State
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= 1024);

  // Worker Info Modal & 3-Dots Menu State
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [is3DotsOpen, setIs3DotsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // New Transaction Form State
  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');
  const [category, setCategory] = useState<'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT' | 'CHAT'>('GOLD');
  const [itemName, setItemName] = useState('');
  const [amountCash, setAmountCash] = useState('');
  const [cashMetalLink, setCashMetalLink] = useState<'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH'>('FOR_GOLD');
  const [appliedRatePerGram, setAppliedRatePerGram] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [touchPercentage, setTouchPercentage] = useState('100');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeMenuTxId, setActiveMenuTxId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'down' | 'up'>('down');
  const [replyTo, setReplyTo] = useState<ReplyMessageData | null>(null);

  // Edit Message & Edit History Modal State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [historyTx, setHistoryTx] = useState<WorkerTransactionItem | null>(null);

  const isSendingRef = useRef(isSending);
  const searchQueryRef = useRef(searchQuery);

  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Close active message dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuTxId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Full-Screen Image Lightbox Preview & WhatsApp Share State
  const [previewImageData, setPreviewImageData] = useState<{ url: string; title: string } | null>(null);

  // Worker Profile Edit Mode State
  const [isEditingWorker, setIsEditingWorker] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const handleOpenWorkerModal = () => {
    setEditName(worker.name || '');
    setEditPhone(worker.phone || '');
    setEditAddress(worker.address || '');
    setEditSpecialization(worker.specialization || '');
    setEditNotes(worker.notes || '');
    setEditPhotoUrl(worker.photo_url || '');
    setIsEditingWorker(false);
    setShowWorkerModal(true);
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const webpUrl = await convertImageToWebP(file, { quality: 0.90 });
      setEditPhotoUrl(webpUrl);
    } catch (err) {
      console.error('Failed to convert profile photo to WebP:', err);
    }
  };

  const handleSaveWorkerProfile = async () => {
    if (!editName.trim()) {
      alert('⚠️ Please enter worker name.');
      return;
    }
    setIsSavingWorker(true);
    try {
      const res = await fetch(`${API_BASE}/work-assignment/workers/${worker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          address: editAddress,
          specialization: editSpecialization,
          notes: editNotes,
          photo_url: editPhotoUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.worker) {
        const updatedWorker = data.worker;
        setWorker(updatedWorker);
        if (onSelectWorker) onSelectWorker(updatedWorker);
        setIsEditingWorker(false);
        alert(`✅ Worker profile updated successfully for ${updatedWorker.name}!`);
      } else {
        alert(`❌ Failed to update worker profile: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`❌ Error updating worker profile: ${err.message}`);
    } finally {
      setIsSavingWorker(false);
    }
  };

  // Message Preview Panel Preference State (Persisted Locally & Database)
  const [isMessagePreviewEnabled, setIsMessagePreviewEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('jbj_message_preview_enabled');
    return stored !== null ? stored === 'true' : true;
  });

  // Error Diagnostics State (100% Error Visibility)
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchInitialTransactions();
    fetchUserSettings();
    initFcmPushNotifications('ADMIN', 'ADMIN');
  }, [worker?.id]);

  // ── INDEXEDDB OFFLINE AUTO-SYNC LISTENER ──
  useEffect(() => {
    const handleOnline = async () => {
      console.log('⚡ [Online] Connection restored! Processing pending IndexedDB queue...');
      const { syncedCount } = await processPendingQueue(async (payload) => {
        const formData = new FormData();
        Object.keys(payload).forEach((k) => formData.append(k, payload[k]));
        const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
          method: 'POST',
          body: formData,
        });
        return await res.json();
      });
      if (syncedCount > 0) {
        fetchInitialTransactions();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [worker?.id]);

  const fetchUserSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/user-settings`);
      const data = await res.json();
      if (data.success && data.settings && typeof data.settings.message_preview_enabled === 'boolean') {
        if (localStorage.getItem('jbj_message_preview_enabled') === null) {
          setIsMessagePreviewEnabled(data.settings.message_preview_enabled);
          localStorage.setItem('jbj_message_preview_enabled', String(data.settings.message_preview_enabled));
        }
      }
    } catch (err) {
      console.warn('Could not fetch user settings:', err);
    }
  };

  const toggleMessagePreview = async () => {
    const newValue = !isMessagePreviewEnabled;
    setIsMessagePreviewEnabled(newValue);
    localStorage.setItem('jbj_message_preview_enabled', String(newValue));

    try {
      await fetch(`${API_BASE}/work-assignment/user-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_preview_enabled: newValue }),
      });
    } catch (err) {
      console.warn('Failed to sync user settings to database:', err);
    }
  };

  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const notifyNewIncomingTransactions = (txList: WorkerTransactionItem[]) => {
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

        if (tx.direction === 'INCOMING') {
          playJbjNotificationSound();
          const senderTitle = `${worker?.name || 'Worker'} (Goldsmith Worker)`;
          const summaryText = tx.notes || (tx.amount_cash ? `Cash Sent: ₹${tx.amount_cash.toLocaleString('en-IN')}` : tx.weight_grams ? `Metal Sent: ${tx.weight_grams}g` : 'New transaction message');
          triggerDeviceNotification(senderTitle, summaryText);
        }
      }
    }
  };

  useEffect(() => {
    let sub: any;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', (state) => {
        if (state.isActive && worker?.id) {
          fetchInitialTransactions();
        }
      }).then((s) => { sub = s; });
    }
    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [worker?.id]);

  useEffect(() => {
    setTransactions([]);
    setHasMoreOlderMessages(true);

    // Mark ONLY this active worker's inbound messages as READ when Admin opens their chat screen
    if (worker?.id) {
      fetch(`${API_BASE}/work-assignment/worker-transactions/mark-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: worker.id, direction: 'INCOMING' }),
      })
        .then(() => fetchInitialTransactions())
        .catch(() => fetchInitialTransactions());
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
              scrollToBottom(true);
            }
          } catch (err) {
            console.warn('SSE parse error:', err);
          }
        });

        eventSource.addEventListener('MARK_READ', (event: any) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && String(payload.worker_id) === String(worker.id)) {
              setTransactions((prev) =>
                prev.map((t) => {
                  const matchDir = payload.direction ? t.direction === payload.direction : true;
                  if (matchDir) {
                    return { ...t, status_state: 'READ', is_seen: 'YES', read_at: payload.read_at || t.read_at };
                  }
                  return t;
                })
              );
            }
          } catch { }
        });

        eventSource.addEventListener('MESSAGE_EDITED', (event: any) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && String(payload.worker_id) === String(worker.id)) {
              setTransactions((prev) =>
                prev.map((t) => {
                  if (t.id === payload.id) {
                    return { ...t, notes: payload.notes, edited_at_history: payload.edited_at_history };
                  }
                  return t;
                })
              );
            }
          } catch { }
        });

        eventSource.addEventListener('MESSAGE_DELETED', (event: any) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && String(payload.worker_id) === String(worker.id)) {
              setTransactions((prev) => prev.filter((t) => t.id !== payload.id));
            }
          } catch { }
        });
      } catch (err) {
        console.warn('EventSource connection exception:', err);
      }
    }

    const handleLocalMsg = (e: any) => {
      if (e.detail && worker?.id && String(e.detail.worker_id) === String(worker.id)) {
        setTransactions((prev) => {
          if (e.detail.direction === 'INCOMING') {
            playJbjNotificationSound();
          }
          return mergeTransactions(prev, [e.detail], worker.id);
        });
        scrollToBottom(true);
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
              if (tx.direction === 'INCOMING') {
                playJbjNotificationSound();
              }
              return mergeTransactions(prev, [tx], worker.id);
            });
            scrollToBottom(true);
          }
        }
      };
    } catch { }

    return () => {
      window.removeEventListener('jbj_chat_message_sent', handleLocalMsg);
      if (channel) channel.close();
      if (eventSource) eventSource.close();
    };
  }, [worker?.id]);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
      } else if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 80);
  };

  // Auto-scroll to very bottom (most recent messages) on load / worker switch
  useEffect(() => {
    if (!loading && transactions.length > 0 && !loadingOlderMessages) {
      scrollToBottom(false);
    }
  }, [worker?.id, loading]);

  // Search trigger: Queries 100% of full historical records for this worker, or restores full timeline when cleared
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      fetchFullTransactions(searchQuery);
    } else if (searchQuery === '' && !isSearchOpen) {
      fetchInitialTransactions();
    }
  }, [searchQuery, isSearchOpen]);

  // Initial fetch: 0ms IndexedDB cache load + 7-day backend sync
  const fetchInitialTransactions = async () => {
    if (!worker?.id) return;
    try {
      setLoading(true);
      setFetchError(null);

      // Instant 0ms load from IndexedDB offline cache
      const cached = await getCachedTransactions(worker.id);
      if (cached && cached.length > 0) {
        setTransactions(cached as WorkerTransactionItem[]);
        setLoading(false);
      }

      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions?workerId=${worker.id}&days=7`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions((prev) => {
          const merged = mergeTransactions(prev, data.transactions, worker.id);
          saveCachedTransactions(worker.id, merged);
          return merged;
        });
        scrollToBottom(false);
        if (data.transactions.length < 5) {
          fetchFullTransactions();
        }
      } else {
        const errStr = data.message || data.warning || 'Failed to load transaction history from backend';
        if (!cached || cached.length === 0) setFetchError(errStr);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      // If we already loaded cached messages from IndexedDB, do not display full error banner
      const cached = await getCachedTransactions(worker.id);
      if (!cached || cached.length === 0) {
        setFetchError(`Network Error: ${err.message || 'Could not connect to backend server'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Full History Fetching (For Search or full history request)
  const fetchFullTransactions = async (searchQueryTerm?: string) => {
    if (!worker?.id) return;
    try {
      setLoading(true);
      const url = searchQueryTerm
        ? `${API_BASE}/work-assignment/worker-transactions?workerId=${worker.id}&search=${encodeURIComponent(searchQueryTerm)}`
        : `${API_BASE}/work-assignment/worker-transactions?workerId=${worker.id}&fullHistory=true`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions((prev) => {
          const merged = mergeTransactions(prev, data.transactions, worker.id);
          saveCachedTransactions(worker.id, merged);
          return merged;
        });
        setHasMoreOlderMessages(false);
      }
    } catch (err) {
      console.error('Error fetching full transaction history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Scroll UP On-Demand Loader for Older Messages
  const loadOlderTransactions = async () => {
    if (!worker?.id || loadingOlderMessages || !hasMoreOlderMessages) return;
    const oldestTx = transactions[0];
    if (!oldestTx || !oldestTx.created_at) return;

    try {
      setLoadingOlderMessages(true);
      const beforeIso = oldestTx.created_at;
      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions?workerId=${worker.id}&days=7&beforeDate=${encodeURIComponent(beforeIso)}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.transactions)) {
        if (data.transactions.length === 0) {
          setHasMoreOlderMessages(false);
        } else {
          const container = chatContainerRef.current;
          const oldScrollHeight = container ? container.scrollHeight : 0;

          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newOlder = data.transactions.filter((t: any) => !existingIds.has(t.id));
            return [...newOlder, ...prev];
          });

          setTimeout(() => {
            if (container) {
              container.scrollTop = container.scrollHeight - oldScrollHeight;
            }
          }, 50);
        }
      }
    } catch (err) {
      console.error('Failed to load older transactions:', err);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const webpFile = await convertImageToWebPBlob(file, { quality: 0.90 });
        const localPreviewUrl = URL.createObjectURL(webpFile);
        setPhotoFiles((prev) => [...prev, webpFile]);
        setPhotos((prev) => [...prev, localPreviewUrl]);
      } catch (err) {
        console.error('Failed to convert transaction photo to binary WebP:', err);
      }
    }
  };

  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPhotos = photos && photos.length > 0;

    if (!hasPhotos) {
      if (category === 'CHAT' && !notes.trim()) {
        alert('⚠️ Please enter a message to send.');
        return;
      }
      if (category === 'CASH' && !amountCash) {
        alert('⚠️ Validation Error: Please enter cash amount or attach photos.');
        return;
      }
      if (category === 'CASH' && (cashMetalLink === 'FOR_GOLD' || cashMetalLink === 'FOR_SILVER') && !appliedRatePerGram) {
        alert(`⚠️ Validation Error: Please enter Rate per Gram (₹) for ${cashMetalLink === 'FOR_GOLD' ? 'Gold' : 'Silver'} purpose.`);
        return;
      }
      if (category !== 'CASH' && category !== 'CHAT' && !weightGrams) {
        alert('⚠️ Validation Error: Please enter gold/ornament/silver weight or attach photos.');
        return;
      }
    }

    const defaultName = hasPhotos && !amountCash && !weightGrams
      ? 'Photo Attachment'
      : category === 'CASH'
        ? 'Cash Payment'
        : category === 'GOLD'
          ? 'Raw Gold Bar'
          : category === 'SILVER'
            ? 'Raw Silver Bar'
            : 'Ornament Item';

    const formattedItemName = toSentenceCase(itemName.trim()) || defaultName;
    const formattedNotes = toSentenceCase(notes.trim());
    const defaultTouch = 100.0;

    // ── 1. OPTIMISTIC INSTANT (0ms) LOCAL BUBBLE INSERTION ──
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempTx: WorkerTransactionItem = {
      id: tempId,
      worker_id: worker.id,
      direction: direction,
      category: category,
      amount_cash: amountCash ? Number(amountCash) : 0,
      cash_metal_link: category === 'CASH' ? cashMetalLink : undefined,
      applied_rate_per_gram: appliedRatePerGram ? Number(appliedRatePerGram) : 0,
      weight_grams: weightGrams ? Number(weightGrams) : 0,
      touch_percentage: weightGrams ? Number(touchPercentage) || defaultTouch : undefined,
      item_name: formattedItemName,
      notes: formattedNotes,
      photos: [...photos],
      created_at: new Date().toISOString(),
      status_state: 'SENDING',
      reply_to: replyTo,
    };

    // Instant append to chat screen & scroll to bottom
    setTransactions((prev) => [...prev, tempTx]);
    scrollToBottom(true);

    // Save current form payload for background network sending & reset form UI immediately
    const currentPhotoFiles = [...photoFiles];
    const currentReplyTo = replyTo;

    setAmountCash('');
    setAppliedRatePerGram('');
    setWeightGrams('');
    setTouchPercentage('100');
    setItemName('');
    setNotes('');
    setPhotos([]);
    setPhotoFiles([]);
    setReplyTo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsSending(true);
    setSendError(null);

    // ── 2. ASYNC BACKGROUND NETWORK POST ──
    try {
      const formData = new FormData();
      formData.append('worker_id', worker.id);
      formData.append('direction', direction);
      formData.append('category', category);

      if (amountCash) formData.append('amount_cash', String(Number(amountCash) || 0));
      if (category === 'CASH' && cashMetalLink) formData.append('cash_metal_link', cashMetalLink);
      if (category === 'CASH' && appliedRatePerGram) formData.append('applied_rate_per_gram', String(Number(appliedRatePerGram) || 0));
      if (weightGrams) {
        formData.append('weight_grams', String(Number(weightGrams) || 0));
        formData.append('touch_percentage', String(Number(touchPercentage) || defaultTouch));
      }
      if (itemName.trim()) formData.append('item_name', formattedItemName);
      formData.append('notes', formattedNotes);

      if (currentReplyTo) {
        formData.append('reply_to', JSON.stringify(currentReplyTo));
      }

      currentPhotoFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.transaction) {
        const newTx = { ...data.transaction, status_state: 'DELIVERED' };
        setTransactions((prev) => {
          const filtered = prev.filter((t) => t.id !== tempId);
          const merged = mergeTransactions(filtered, [newTx], worker.id);
          saveCachedTransactions(worker.id, merged);
          return merged;
        });
        scrollToBottom(true);
      } else {
        const errDetail = data.message || data.warning || JSON.stringify(data);
        setSendError(errDetail);
        // Mark optimistic temp transaction as FAILED
        setTransactions((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, status_state: 'FAILED' } : t))
        );
      }
    } catch (err: any) {
      console.error('Error sending transaction:', err);
      const connErr = `Connection Error: ${err.message || 'Server did not respond'}`;
      setSendError(connErr);

      // Enqueue to IndexedDB offline queue for auto-sync when network returns
      enqueuePendingTransaction(tempId, worker.id, {
        worker_id: worker.id,
        direction,
        category,
        amount_cash: amountCash ? String(Number(amountCash)) : '0',
        weight_grams: weightGrams ? String(Number(weightGrams)) : '0',
        item_name: formattedItemName,
        notes: formattedNotes,
      });

      // Mark optimistic temp transaction as FAILED / PENDING_OFFLINE
      setTransactions((prev) =>
        prev.map((t) => (t.id === tempId ? { ...t, status_state: 'FAILED' } : t))
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (txId: string) => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions/${txId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === txId ? { ...t, is_deleted: true } : t))
        );
      } else {
        alert(`❌ Failed to delete message: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error deleting message:', err);
      alert(`❌ Network error deleting message: ${err.message || 'Server did not respond'}`);
    }
  };

  const handleSaveEditMessage = async () => {
    if (!editingTxId) return;
    try {
      setIsSavingEdit(true);
      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions/${editingTxId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editText }),
      });
      const data = await res.json();
      if (data.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editingTxId
              ? { ...t, notes: editText, edited_at_history: data.edited_at_history || t.edited_at_history }
              : t
          )
        );
        setEditingTxId(null);
        setEditText('');
      } else {
        alert(`❌ Failed to edit message: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error editing message:', err);
      alert(`❌ Error editing message: ${err.message || 'Server did not respond'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── STRICT 100% PURE FINE METAL BALANCES CALCULATION ──
  let totalGoldSentFine = 0;
  let totalGoldReceivedFine = 0;
  let totalSilverSentFine = 0;
  let totalSilverReceivedFine = 0;
  let totalCashSent = 0;
  let totalCashReceived = 0;

  transactions.forEach((t) => {
    if (t.is_deleted) return;
    const weight = Number(t.weight_grams) || 0;
    const touch = Number(t.touch_percentage) || 100.0;
    const fine = t.fine_weight_grams ? Number(t.fine_weight_grams) : (weight * touch / 100);

    if (t.direction === 'OUTGOING') {
      if (t.category === 'GOLD' || t.category === 'ORNAMENT') totalGoldSentFine += fine;
      else if (t.category === 'SILVER') totalSilverSentFine += fine;
      else if (t.category === 'CASH') {
        if (t.cash_metal_link === 'FOR_GOLD') {
          const equiv = Number(t.equivalent_metal_grams) || (Number(t.applied_rate_per_gram) ? (Number(t.amount_cash) / Number(t.applied_rate_per_gram)) : 0);
          totalGoldSentFine += equiv;
        } else if (t.cash_metal_link === 'FOR_SILVER') {
          const equiv = Number(t.equivalent_metal_grams) || (Number(t.applied_rate_per_gram) ? (Number(t.amount_cash) / Number(t.applied_rate_per_gram)) : 0);
          totalSilverSentFine += equiv;
        } else {
          totalCashSent += Number(t.amount_cash) || 0;
        }
      }
    } else {
      if (t.category === 'GOLD' || t.category === 'ORNAMENT') totalGoldReceivedFine += fine;
      else if (t.category === 'SILVER') totalSilverReceivedFine += fine;
      else if (t.category === 'CASH') {
        if (t.cash_metal_link === 'FOR_GOLD') {
          const equiv = Number(t.equivalent_metal_grams) || (Number(t.applied_rate_per_gram) ? (Number(t.amount_cash) / Number(t.applied_rate_per_gram)) : 0);
          totalGoldReceivedFine += equiv;
        } else if (t.cash_metal_link === 'FOR_SILVER') {
          const equiv = Number(t.equivalent_metal_grams) || (Number(t.applied_rate_per_gram) ? (Number(t.amount_cash) / Number(t.applied_rate_per_gram)) : 0);
          totalSilverReceivedFine += equiv;
        } else {
          totalCashReceived += Number(t.amount_cash) || 0;
        }
      }
    }
  });

  const netFineGoldBalance = totalGoldSentFine - totalGoldReceivedFine;
  const netFineSilverBalance = totalSilverSentFine - totalSilverReceivedFine;
  const netCashBalance = totalCashSent - totalCashReceived;

  // ── IN-CHAT SEARCH & AUTO SCROLL TO MATCH ──
  const matchedTxIds = transactions.filter((t) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    const item = (t.item_name || '').toLowerCase();
    const notesStr = (t.notes || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const amt = String(t.amount_cash || '');
    const wt = String(t.weight_grams || '');
    const touch = String(t.touch_percentage || '');

    return item.includes(q) || notesStr.includes(q) || cat.includes(q) || amt.includes(q) || wt.includes(q) || touch.includes(q);
  }).map((t) => t.id);

  useEffect(() => {
    if (matchedTxIds.length > 0) {
      if (activeMatchIdx >= matchedTxIds.length) {
        setActiveMatchIdx(0);
      }
      const targetId = matchedTxIds[activeMatchIdx] || matchedTxIds[0];
      const el = document.getElementById(`tx-bubble-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchQuery, activeMatchIdx]);

  const filteredSidebarWorkers = [...workers]
    .filter((w) =>
      w.name?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
      w.specialization?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const timeA = lastMessageTimes[a.id] || a.last_message_at || a.updated_at || a.created_at || '';
      const timeB = lastMessageTimes[b.id] || b.last_message_at || b.updated_at || b.created_at || '';
      const dateA = timeA ? new Date(timeA).getTime() : 0;
      const dateB = timeB ? new Date(timeB).getTime() : 0;
      return dateB - dateA;
    });

  return (
    <div className="tablet-dense-view worker-chat-view" style={{ background: '#f0f2f5', borderRadius: '18px', border: '1px solid #cbd5e1', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'row', height: 'calc(97vh - 45px)', overflow: 'hidden' }}>

      {/* ── SLIM WORKER SWITCHER SIDEBAR (1-CLICK USER SWITCH) ── */}
      <WorkerSidebar
        workers={workers}
        worker={worker}
        sidebarSearchQuery={sidebarSearchQuery}
        setSidebarSearchQuery={setSidebarSearchQuery}
        unreadCounts={unreadCounts}
        lastMessageTimes={lastMessageTimes}
        onSelectWorker={handleWorkerChange}
        filteredSidebarWorkers={filteredSidebarWorkers}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />


      {/* ── MAIN CHAT PANEL (RIGHT SIDE) ── */}
      {!worker ? (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '2px dashed #fde68a', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)' }}>
            <i className="fa-solid fa-comments" style={{ fontSize: '2.5rem', color: '#d97706' }} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Select a Worker to View Chat
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
            Choose a goldsmith or artisan from the left sidebar to view their transaction history, send raw gold/silver entries, or send messages.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* ── CHAT HEADER ── */}
          <ChatHeader
            worker={worker}
            lang={lang}
            netFineGoldBalance={netFineGoldBalance}
            netFineSilverBalance={netFineSilverBalance}
            netCashBalance={netCashBalance}
            isSearchOpen={isSearchOpen}
            is3DotsOpen={is3DotsOpen}
            setIs3DotsOpen={setIs3DotsOpen}
            isMessagePreviewEnabled={isMessagePreviewEnabled}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            matchedTxIds={matchedTxIds}
            activeMatchIdx={activeMatchIdx}
            setActiveMatchIdx={setActiveMatchIdx}
            searchInputRef={searchInputRef}
            onBack={onBack}
            onOpenWorkerModal={handleOpenWorkerModal}
            onOpenSearch={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            onCloseSearch={() => { setIsSearchOpen(false); setSearchQuery(""); setActiveMatchIdx(0); fetchInitialTransactions(); }}
            onToggleMessagePreview={toggleMessagePreview}
            setPreviewImageData={setPreviewImageData}
            setShowWorkerModal={setShowWorkerModal}
          />

          {/* ── CHAT MESSAGES TIMELINE (VIVID SLATE-PEARL WALLPAPER) ── */}
          <div
            ref={chatContainerRef}
            onScroll={(e) => {
              if (e.currentTarget.scrollTop < 60 && hasMoreOlderMessages && !loadingOlderMessages && !searchQuery) {
                loadOlderTransactions();
              }
            }}
            style={{ flex: 1, minHeight: 0, padding: '1rem 1.25rem', overflowY: 'auto', overflowX: 'hidden', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          >
            {/* Scroll-Up Loading Indicator */}
            {loadingOlderMessages && (
              <div style={{ textAlign: 'center', padding: '6px 0', fontSize: '0.72rem', color: '#0284c7', fontWeight: 800, background: '#e0f2fe', borderRadius: '8px', marginBottom: '10px' }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Loading older transactions...
              </div>
            )}

            {hasMoreOlderMessages && !searchQuery && transactions.length >= 5 && (
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={loadOlderTransactions}
                  style={{ padding: '4px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  📜 Scroll Up or Click to Load Older History
                </button>
              </div>
            )}

            {/* ── 100% ERROR DIAGNOSTIC WARNING BANNER ── */}
            {(fetchError || sendError) && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.80rem', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> 100% Diagnostic Error Details
                  </strong>
                  <button
                    type="button"
                    onClick={() => { setFetchError(null); setSendError(null); }}
                    style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <p style={{ margin: 0, fontWeight: 600 }}>{sendError || fetchError}</p>
                <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#7f1d1d' }}>
                  💡 All transactions are automatically backed up to local persistent disk storage so no chat history is ever lost.
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.5rem', color: '#d97706', marginBottom: '0.5rem' }}></i>
                <p style={{ margin: 0, fontSize: '0.82rem' }}>Loading transaction history...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <i className="fa-solid fa-comments" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.5rem' }}></i>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>No payment or gold transactions recorded yet</p>
                <span style={{ fontSize: '0.75rem' }}>Use the input bar below to log outgoing cash/gold or incoming return ornaments.</span>
              </div>
            ) : (
              (() => {
                let lastDateHeader = "";
                return transactions.map((t) => {
                  const isMatched = matchedTxIds.includes(t.id);
                  const isCurrentActiveMatch = matchedTxIds[activeMatchIdx] === t.id;
                  const currentDateHeader = formatDateDivider(t.created_at);
                  const showDateHeader = !!currentDateHeader && currentDateHeader !== lastDateHeader;
                  if (showDateHeader) lastDateHeader = currentDateHeader;
                  return (
                    <React.Fragment key={t.id}>
                      {showDateHeader && (
                        <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 10px 0", width: "100%" }}>
                          <span
                            style={{
                              background: "#ffffff",
                              color: "#54656f",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "4px 12px",
                              borderRadius: "8px",
                              boxShadow: "0 1px 3px rgba(11, 20, 26, 0.12)",
                              border: "1px solid #e2e8f0",
                              letterSpacing: "0.01em",
                              textTransform: "capitalize",
                              userSelect: "none",
                            }}
                          >
                            {currentDateHeader}
                          </span>
                        </div>
                      )}
                      <MessageBubble
                        t={t}
                        workerName={worker?.name || "Worker"}
                        isMatched={isMatched}
                        isCurrentActiveMatch={isCurrentActiveMatch}
                        activeMenuTxId={activeMenuTxId}
                        menuPosition={menuPosition}
                        setActiveMenuTxId={setActiveMenuTxId}
                        setMenuPosition={setMenuPosition}
                        setReplyTo={setReplyTo}
                        setEditingTxId={setEditingTxId}
                        setEditText={setEditText}
                        setHistoryTx={setHistoryTx}
                        setPreviewImageData={setPreviewImageData}
                        onDeleteMessage={handleDeleteMessage}
                        toSentenceCase={toSentenceCase}
                        downloadImageAsJpeg={downloadImageAsJpeg}
                      />
                    </React.Fragment>
                  );
                });
              })()
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* ── ACCORDION FORM (TRANSACTION INPUT) ── */}
          <TransactionInputForm
            isAccordionExpanded={isAccordionExpanded}
            setIsAccordionExpanded={setIsAccordionExpanded}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            isMessagePreviewEnabled={isMessagePreviewEnabled}
            onToggleMessagePreview={toggleMessagePreview}
            direction={direction}
            setDirection={setDirection}
            category={category}
            setCategory={setCategory}
            itemName={itemName}
            setItemName={setItemName}
            amountCash={amountCash}
            setAmountCash={setAmountCash}
            cashMetalLink={cashMetalLink}
            setCashMetalLink={setCashMetalLink}
            appliedRatePerGram={appliedRatePerGram}
            setAppliedRatePerGram={setAppliedRatePerGram}
            weightGrams={weightGrams}
            setWeightGrams={setWeightGrams}
            touchPercentage={touchPercentage}
            setTouchPercentage={setTouchPercentage}
            notes={notes}
            setNotes={setNotes}
            photos={photos}
            setPhotos={setPhotos}
            setPhotoFiles={setPhotoFiles}
            isSending={isSending}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onSubmit={handleSendTransaction}
            toSentenceCase={toSentenceCase}
          />
        </div>
      )}

      {/* ── WORKER PROFILE INFORMATION DIALOG MODAL ── */}
      {showWorkerModal && (
        <WorkerProfileModal
          worker={worker}
          isEditingWorker={isEditingWorker}
          setIsEditingWorker={setIsEditingWorker}
          editName={editName}
          setEditName={setEditName}
          editPhone={editPhone}
          setEditPhone={setEditPhone}
          editAddress={editAddress}
          setEditAddress={setEditAddress}
          editSpecialization={editSpecialization}
          setEditSpecialization={setEditSpecialization}
          editNotes={editNotes}
          setEditNotes={setEditNotes}
          editPhotoUrl={editPhotoUrl}
          isSavingWorker={isSavingWorker}
          profilePhotoInputRef={profilePhotoInputRef}
          onClose={() => setShowWorkerModal(false)}
          onSave={handleSaveWorkerProfile}
          onProfilePhotoUpload={handleProfilePhotoUpload}
          setPreviewImageData={setPreviewImageData}
        />
      )}

      {/* ── EDIT MESSAGE MODAL ── */}
      {editingTxId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-pen-to-square" style={{ color: '#0284c7' }} /> Edit Message
              </h4>
              <button type="button" onClick={() => setEditingTxId(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Edit message notes..."
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setEditingTxId(null)}
                style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit || !editText.trim()}
                onClick={handleSaveEditMessage}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', opacity: isSavingEdit || !editText.trim() ? 0.6 : 1 }}
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT HISTORY MODAL ── */}
      {historyTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: '#0284c7' }} /> Edit History
              </h4>
              <button type="button" onClick={() => setHistoryTx(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', marginBottom: '1rem' }}>
              {historyTx.edited_at_history && historyTx.edited_at_history.length > 0 ? (
                historyTx.edited_at_history.map((ts: string, idx: number) => (
                  <div key={idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                    <div style={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem' }}>Edit #{idx + 1}</div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>{new Date(ts).toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No edit history available</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setHistoryTx(null)}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL-SCREEN IMAGE LIGHTBOX MODAL & WHATSAPP SHARE ── */}
      {previewImageData && (
        <FullImagePreviewModal
          imageUrl={previewImageData.url}
          title={previewImageData.title}
          onClose={() => setPreviewImageData(null)}
        />
      )}
    </div>
  );
};
