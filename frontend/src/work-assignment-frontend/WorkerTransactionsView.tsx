import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations, type Language } from '../utils/translations';
import { getWorkAssignmentTranslation } from './workAssignmentTranslations';
import { FullImagePreviewModal } from '../inventory-frontend/components/FullImagePreviewModal';
import { convertImageToWebP, convertImageToWebPBlob, downloadImageAsJpeg } from '../utils/imageUtils';
import { playJbjNotificationSound } from '../utils/soundUtils';
import { triggerDeviceNotification } from '../utils/nativeNotification';

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
  const t = getWorkAssignmentTranslation(lang);
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
      }).catch(() => {});
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

  // Accordion Toggle State for Bottom Form
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(true);

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
  const [touchPercentage, setTouchPercentage] = useState('91.6');
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
              setTransactions((prev) => {
                if (prev.some((t) => t.id === tx.id)) return prev;
                if (tx.direction === 'INCOMING') {
                  playJbjNotificationSound();
                  const senderTitle = `📩 ${worker?.name || 'Worker'} (Goldsmith Worker)`;
                  const summaryText = tx.notes || (tx.amount_cash ? `Cash Sent: ₹${tx.amount_cash.toLocaleString('en-IN')}` : tx.weight_grams ? `Metal Sent: ${tx.weight_grams}g` : 'New transaction message');
                  triggerDeviceNotification(senderTitle, summaryText);
                  // Instantly mark read since Admin is currently actively looking at chat screen
                  fetch(`${API_BASE}/work-assignment/worker-transactions/mark-read`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ worker_id: worker.id, direction: 'INCOMING' }),
                  }).catch(() => {});
                }
                return [...prev, tx];
              });
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
          } catch {}
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
          } catch {}
        });

        eventSource.addEventListener('MESSAGE_DELETED', (event: any) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && String(payload.worker_id) === String(worker.id)) {
              setTransactions((prev) => prev.filter((t) => t.id !== payload.id));
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
          if (e.detail.direction === 'INCOMING') {
            playJbjNotificationSound();
          }
          return [...prev, e.detail];
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
              if (prev.some((t) => t.id === tx.id)) return prev;
              if (tx.direction === 'INCOMING') {
                playJbjNotificationSound();
              }
              return [...prev, tx];
            });
            scrollToBottom(true);
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

  // Initial fetch: Recent 7 Days only for fast load!
  const fetchInitialTransactions = async () => {
    if (!worker?.id) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions?workerId=${worker.id}&days=7`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        scrollToBottom(false);
        if (data.transactions.length < 5) {
          fetchFullTransactions();
        }
      } else {
        const errStr = data.message || data.warning || 'Failed to load transaction history from backend';
        setFetchError(errStr);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setFetchError(`Network Error: ${err.message || 'Could not connect to backend server'}`);
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
        setTransactions(data.transactions);
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

    setIsSending(true);
    setSendError(null);

    try {
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

      const defaultTouch = category === 'SILVER' ? 80.0 : 91.6;

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

      if (replyTo) {
        formData.append('reply_to', JSON.stringify(replyTo));
      }

      // Attach binary WebP Blobs directly without Base64 strings!
      photoFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.transaction) {
        const newTx = data.transaction;
        setTransactions((prev) => {
          if (prev.some((t) => t.id === newTx.id)) return prev;
          return [...prev, newTx];
        });
        scrollToBottom(true);
        // Reset form inputs
        setAmountCash('');
        setAppliedRatePerGram('');
        setWeightGrams('');
        setTouchPercentage('91.6');
        setItemName('');
        setNotes('');
        setPhotos([]);
        setPhotoFiles([]);
        setReplyTo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (data.warning) {
          console.warn('⚡ Transaction Notice:', data.warning);
        }
      } else {
        const errDetail = data.message || data.warning || JSON.stringify(data);
        setSendError(errDetail);
        alert(`❌ FAILED TO RECORD TRANSACTION:\n\n100% Error Reason: ${errDetail}`);
      }
    } catch (err: any) {
      console.error('Error sending transaction:', err);
      const connErr = `Connection Error: ${err.message || 'Server did not respond'}`;
      setSendError(connErr);
      alert(`❌ NETWORK ERROR RECORDING TRANSACTION:\n\n${connErr}`);
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
    const touch = Number(t.touch_percentage) || (t.category === 'SILVER' ? 80.0 : 91.6);
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
      <div
        style={{
          width: '200px',
          borderRight: '1px solid #cbd5e1',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Sidebar Header & Search */}
        <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('module', 'work-assignment');
              params.set('view', 'work-history');
              params.set('workerId', 'ALL');
              window.history.pushState({}, '', `?${params.toString()}`);
              window.dispatchEvent(new Event('popstate'));
            }}
            style={{
              width: '100%',
              padding: '6px 10px',
              marginBottom: '8px',
              borderRadius: '8px',
              border: '1px solid #b45309',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)',
              transition: 'all 0.15s ease',
            }}
            title="Go to Worker History"
          >
            <i className="fa-solid fa-clock-rotate-left"></i> Worker History
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="fa-solid fa-users" style={{ color: '#075e54', fontSize: '0.8rem' }}></i> Workers
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '8px' }}>
              {workers.length}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.70rem' }}></i>
            <input
              type="text"
              placeholder="Search..."
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '4px 8px 4px 24px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.72rem', outline: 'none', background: '#ffffff' }}
            />
          </div>
        </div>

        {/* Worker Contact List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
          {filteredSidebarWorkers.map((w: any) => {
            const isSelected = w.id === worker?.id;
            const unreadCount = unreadCounts[w.id] ?? w.unread_messages_count ?? 0;
            const rawLastTime = lastMessageTimes[w.id] || w.last_message_at;

            let formattedTime = '';
            if (rawLastTime) {
              const d = new Date(rawLastTime);
              if (!isNaN(d.getTime())) {
                formattedTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              }
            }

            return (
              <div
                key={w.id}
                onClick={() => handleWorkerChange(w)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  padding: '0.55rem 0.75rem',
                  cursor: 'pointer',
                  background: isSelected ? '#e0f2fe' : unreadCount > 0 ? '#fffbeb' : 'transparent',
                  borderLeft: isSelected ? '4px solid #0284c7' : unreadCount > 0 ? '4px solid #d97706' : '4px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                title={`Switch to ${w.name}${unreadCount > 0 ? ` (${unreadCount} unread messages)` : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  {w.photo_url ? (
                    <img
                      src={w.photo_url}
                      alt={w.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isSelected ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        flexShrink: 0,
                      }}
                    >
                      {w.name ? w.name.charAt(0) : '?'}
                    </div>
                  )}

                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                    <div style={{ fontWeight: isSelected || unreadCount > 0 ? 800 : 700, fontSize: '0.78rem', color: isSelected ? '#0369a1' : unreadCount > 0 ? '#b45309' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.name}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: isSelected ? '#0284c7' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.specialization || 'Goldsmith'}
                    </div>
                  </div>
                </div>

                {/* Right Side: Timestamp + Vibrant Orange Unread Badge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, marginLeft: '4px' }}>
                  {formattedTime && (
                    <span style={{ fontSize: '0.60rem', fontWeight: unreadCount > 0 ? 800 : 600, color: unreadCount > 0 ? '#d97706' : '#94a3b8' }}>
                      {formattedTime}
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '9px',
                        padding: '0 5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(180, 83, 9, 0.35)',
                        lineHeight: 1,
                      }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
        <div style={{ background: '#ffffff', padding: '0.6rem 1rem', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>

          {/* Left Side: Back button + Clickable Worker Profile Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flexShrink: 1 }}>
            <button
              onClick={onBack}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', flexShrink: 0 }}
              title="Back to Workers"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>

            {/* Clickable Worker Profile Header */}
            <div
              onClick={() => {
                if (worker.photo_url) {
                  setPreviewImageData({ url: worker.photo_url, title: `${worker.name} Profile Picture` });
                } else {
                  setShowWorkerModal(true);
                }
              }}
              title="Click to view worker profile picture & information"
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', overflow: 'hidden' }}
            >
              {worker.photo_url ? (
                <img
                  src={worker.photo_url}
                  alt={worker.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #d97706', boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}>
                  {worker.name.charAt(0)}
                </div>
              )}

              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</span>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: '0.72rem', color: '#0284c7', flexShrink: 0 }}></i>
                </h3>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {worker.specialization} &nbsp;·&nbsp;
                  <strong style={{ color: '#d97706' }}>{worker.assigned_orders_count || 0} Orders</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Center & Right: Fine Metal Balances & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>

            {/* Strict 100% Fine Metal Balance summary pills */}
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {/* Pure Gold Pill */}
              <div
                title={netFineGoldBalance > 0.0001 ? t.workerNeedsToSendUs : netFineGoldBalance < -0.0001 ? t.needsToSendWorker : t.fullySettled}
                style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '6px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '65px' }}
              >
                <span style={{ fontSize: '0.55rem', color: '#b45309', fontWeight: 800, display: 'block' }}>{t.pureGoldLabel}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                  {netFineGoldBalance > 0.0001 ? (
                    <i className="fa-solid fa-arrow-down" style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 900 }} />
                  ) : netFineGoldBalance < -0.0001 ? (
                    <i className="fa-solid fa-arrow-up" style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 900 }} />
                  ) : null}
                  <strong style={{ fontSize: '0.66rem', color: netFineGoldBalance < -0.0001 ? '#dc2626' : '#92400e', fontWeight: 800 }}>
                    {Math.abs(netFineGoldBalance).toFixed(3)} g
                  </strong>
                </div>
              </div>

              {/* Pure Silver Pill */}
              <div
                title={netFineSilverBalance > 0.0001 ? 'Worker needs to send to us' : netFineSilverBalance < -0.0001 ? 'Needs to send to worker' : 'Fully Settled'}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '6px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '65px' }}
              >
                <span style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 800, display: 'block' }}>Pure Silver</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                  {netFineSilverBalance > 0.0001 ? (
                    <i className="fa-solid fa-arrow-down" style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 900 }} />
                  ) : netFineSilverBalance < -0.0001 ? (
                    <i className="fa-solid fa-arrow-up" style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 900 }} />
                  ) : null}
                  <strong style={{ fontSize: '0.66rem', color: netFineSilverBalance < -0.0001 ? '#dc2626' : '#334155', fontWeight: 800 }}>
                    {Math.abs(netFineSilverBalance).toFixed(3)} g
                  </strong>
                </div>
              </div>

              {/* Net Cash Pill */}
              <div
                title={netCashBalance > 0.01 ? 'Worker needs to send to us' : netCashBalance < -0.01 ? 'Needs to send to worker' : 'Fully Settled'}
                style={{ background: '#e0f2fe', border: '1px solid #bae6fd', padding: '2px 6px', borderRadius: '6px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '65px' }}
              >
                <span style={{ fontSize: '0.55rem', color: '#0369a1', fontWeight: 800, display: 'block' }}>Net Cash</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                  {netCashBalance > 0.01 ? (
                    <i className="fa-solid fa-arrow-down" style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 900 }} />
                  ) : netCashBalance < -0.01 ? (
                    <i className="fa-solid fa-arrow-up" style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 900 }} />
                  ) : null}
                  <strong style={{ fontSize: '0.66rem', color: netCashBalance < -0.01 ? '#dc2626' : '#075985', fontWeight: 800 }}>
                    ₹{Math.abs(Math.round(netCashBalance)).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Search Magnifying Glass Button */}
            {/* <button
            type="button"
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            style={{ background: isSearchOpen ? '#e0f2fe' : 'none', border: 'none', width: '32px', height: '32px', borderRadius: '8px', fontSize: '0.95rem', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Search Messages"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button> */}

            {/* Simple Borderless Vertical 3-Dots Menu */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIs3DotsOpen(!is3DotsOpen)}
                style={{ background: 'none', border: 'none', padding: '4px 6px', fontSize: '1.25rem', color: '#475569', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="More Options"
              >
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </button>

              {is3DotsOpen && (
                <div style={{ position: 'absolute', right: 0, top: '120%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', minWidth: '180px', zIndex: 100, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIs3DotsOpen(false);
                      setIsSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <i className="fa-solid fa-magnifying-glass" style={{ color: '#0284c7' }}></i> Search Messages
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIs3DotsOpen(false);
                      handleOpenWorkerModal();
                    }}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', borderTop: '1px solid #f1f5f9', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <i className="fa-solid fa-user-gear" style={{ color: '#d97706' }}></i> Worker Information
                  </button>



                  <button
                    type="button"
                    onClick={() => {
                      setIs3DotsOpen(false);
                      toggleMessagePreview();
                    }}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', borderTop: '1px solid #f1f5f9', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-eye" style={{ color: isMessagePreviewEnabled ? '#15803d' : '#64748b' }}></i> Message Preview
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: isMessagePreviewEnabled ? '#dcfce7' : '#f1f5f9', color: isMessagePreviewEnabled ? '#15803d' : '#64748b' }}>
                      {isMessagePreviewEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Floating Search Input Overlay (When Search is Opened) */}
          {isSearchOpen && (
            <div style={{ position: 'absolute', top: 0, right: 0, left: 0, bottom: 0, background: '#ffffff', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', zIndex: 25, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: '#0284c7', fontSize: '0.9rem' }}></i>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={translations[lang]?.searchWorkerChatPlaceholder || 'Search in chat history...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveMatchIdx(0);
                }}
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}
              />

              {searchQuery && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                    {matchedTxIds.length > 0 ? `${activeMatchIdx + 1}/${matchedTxIds.length}` : '0 matches'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveMatchIdx((prev) => (prev - 1 + matchedTxIds.length) % (matchedTxIds.length || 1))}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    <i className="fa-solid fa-chevron-up"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMatchIdx((prev) => (prev + 1) % (matchedTxIds.length || 1))}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    <i className="fa-solid fa-chevron-down"></i>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setActiveMatchIdx(0);
                  fetchInitialTransactions();
                }}
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', color: '#64748b', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 700, flexShrink: 0 }}
              >
                Close
              </button>
            </div>
          )}
        </div>

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
              let lastDateHeader = '';
              return transactions.map((t) => {
                const isOutgoing = t.direction === 'OUTGOING'; // Right aligned (Store to Worker)
                const isMatched = matchedTxIds.includes(t.id);
                const isCurrentActiveMatch = matchedTxIds[activeMatchIdx] === t.id;

                const weight = Number(t.weight_grams) || 0;
                const touch = Number(t.touch_percentage) || (t.category === 'SILVER' ? 80.0 : 91.6);
                const fineGold = t.fine_weight_grams ? Number(t.fine_weight_grams) : (weight * touch / 100);

                const currentDateHeader = formatDateDivider(t.created_at);
                const showDateHeader = currentDateHeader && currentDateHeader !== lastDateHeader;
                if (showDateHeader) {
                  lastDateHeader = currentDateHeader;
                }

                return (
                  <React.Fragment key={t.id}>
                    {showDateHeader && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px 0', width: '100%' }}>
                        <span
                          style={{
                            background: '#ffffff',
                            color: '#54656f',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '4px 12px',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(11, 20, 26, 0.12)',
                            border: '1px solid #e2e8f0',
                            letterSpacing: '0.01em',
                            textTransform: 'capitalize',
                            userSelect: 'none',
                          }}
                        >
                          {currentDateHeader}
                        </span>
                      </div>
                    )}
                    <div
                      id={`tx-bubble-${t.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    className="worker-chat-bubble"
                    style={{
                      maxWidth: '75%',
                      minWidth: '210px',
                      background: isOutgoing ? '#fff7ed' : '#ffffff',
                      borderRadius: isOutgoing ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '0.45rem 0.65rem',
                      boxShadow: isCurrentActiveMatch ? '0 0 0 3px #d97706, 0 4px 16px rgba(217,119,6,0.3)' : isMatched ? '0 0 0 2px #0284c7' : '0 2px 5px rgba(0,0,0,0.06)',
                      position: 'relative',
                      border: isOutgoing ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Badge Header with Options Dropdown Trigger */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '6px', position: 'relative' }}>
                      <span
                        style={{
                          fontSize: '0.60rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '8px',
                          background: isOutgoing ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#0284c7',
                          color: '#ffffff',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isOutgoing ? 'YOU' : 'WORKER'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                        {/* Options Dropdown Trigger */}
                        {!t.is_deleted && (
                          <button
                            type="button"
                            className="wa-menu-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeMenuTxId === t.id) {
                                setActiveMenuTxId(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                setMenuPosition(spaceBelow < 220 ? 'up' : 'down');
                                setActiveMenuTxId(t.id);
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.72rem', padding: '0 3px' }}
                            title="Message options"
                          >
                            <i className="fa-solid fa-caret-down" />
                          </button>
                        )}

                        {/* Dropdown Options Menu */}
                        {activeMenuTxId === t.id && (
                          <div
                            className={`wa-bubble-dropdown ${isOutgoing ? 'wa-bubble-out' : 'wa-bubble-in'}`}
                            style={{
                              top: menuPosition === 'up' ? 'auto' : '100%',
                              bottom: menuPosition === 'up' ? '100%' : 'auto',
                              right: isOutgoing ? 0 : 'auto',
                              left: isOutgoing ? 'auto' : 0,
                              marginTop: menuPosition === 'down' ? '4px' : undefined,
                              marginBottom: menuPosition === 'up' ? '4px' : undefined,
                              whiteSpace: 'nowrap',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!t.is_deleted && (
                              <button
                                type="button"
                                className="wa-dropdown-item"
                                onClick={() => {
                                  setActiveMenuTxId(null);
                                  setReplyTo({
                                    id: t.id,
                                    senderName: isOutgoing ? 'YOU' : worker.name,
                                    notes: t.notes || (t.category === 'CASH' ? `₹${t.amount_cash}` : `${t.weight_grams}g ${t.category}`),
                                    photos: t.photos,
                                  });
                                }}
                              >
                                <i className="fa-solid fa-reply" /> Reply
                              </button>
                            )}

                            {t.notes && !t.is_deleted && (
                              <button
                                type="button"
                                className="wa-dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(t.notes);
                                  alert('📋 Message text copied to clipboard!');
                                  setActiveMenuTxId(null);
                                }}
                              >
                                <i className="fa-solid fa-copy" /> Copy Text
                              </button>
                            )}

                            {isOutgoing && !t.is_deleted && (Date.now() - new Date(t.created_at).getTime() <= 30 * 60 * 1000) && (
                              <button
                                type="button"
                                className="wa-dropdown-item"
                                onClick={() => {
                                  setActiveMenuTxId(null);
                                  setEditingTxId(t.id);
                                  setEditText(t.notes || '');
                                }}
                              >
                                <i className="fa-solid fa-pen-to-square" /> Edit Message
                              </button>
                            )}

                            {t.edited_at_history && t.edited_at_history.length > 0 && (
                              <button
                                type="button"
                                className="wa-dropdown-item"
                                onClick={() => {
                                  setActiveMenuTxId(null);
                                  setHistoryTx(t);
                                }}
                              >
                                <i className="fa-solid fa-clock-rotate-left" /> View Edit History ({t.edited_at_history.length})
                              </button>
                            )}

                            {t.photos && t.photos.length > 0 && (
                              <button
                                type="button"
                                className="wa-dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImageAsJpeg(t.photos[0], `jbj_image_${t.id}.jpeg`);
                                  setActiveMenuTxId(null);
                                }}
                              >
                                <i className="fa-solid fa-download" /> Download Image (JPEG)
                              </button>
                            )}

                            {isOutgoing && !t.is_deleted && (
                              <button
                                type="button"
                                className="wa-dropdown-item text-danger"
                                onClick={() => {
                                  setActiveMenuTxId(null);
                                  if (confirm('Delete this message for everyone?')) {
                                    handleDeleteMessage(t.id);
                                  }
                                }}
                              >
                                <i className="fa-solid fa-trash-can" /> Delete Message
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Deleted Message Placeholder vs Normal Message */}
                    {t.is_deleted ? (
                      <div style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.78rem', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-ban" style={{ color: '#94a3b8' }} /> This message was deleted
                      </div>
                    ) : (
                      <>
                        {/* Quoted Message Reply Display inside Bubble */}
                        {t.reply_to && (
                          <div style={{ background: 'rgba(0,0,0,0.04)', borderLeft: '3px solid #0284c7', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px', fontSize: '0.72rem' }}>
                            <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.65rem' }}>Replying to {t.reply_to.senderName}</div>
                            <div style={{ color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.reply_to.notes}</div>
                          </div>
                        )}

                    {/* Transaction Category & Detailed Breakdown */}
                    {t.photos && t.photos.length > 0 && Number(t.amount_cash) === 0 && Number(t.weight_grams) === 0 ? (
                      <div style={{ margin: '4px 0', padding: '5px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: '0.62rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i> PHOTO ATTACHMENT
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 2px 0' }}>
                          {toSentenceCase(t.item_name || 'Photo Attachment')}
                        </div>
                      </div>
                    ) : t.category === 'CASH' ? (
                      <div style={{ margin: '4px 0', padding: '5px 8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.62rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>💵 CASH PAYMENT</span>
                          {t.cash_metal_link && (
                            <span style={{ fontSize: '0.58rem', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px', color: '#15803d' }}>
                              {t.cash_metal_link === 'FOR_GOLD' ? '🥇 For Gold' : t.cash_metal_link === 'FOR_SILVER' ? '🥈 For Silver' : '💵 General Cash'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d', marginTop: '1px' }}>
                          💵 ₹{t.amount_cash?.toLocaleString('en-IN') || '0'}
                        </div>
                        {t.applied_rate_per_gram && t.applied_rate_per_gram > 0 ? (
                          <div style={{ marginTop: '3px', fontSize: '0.66rem', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span><strong>Rate:</strong> ₹{t.applied_rate_per_gram.toLocaleString('en-IN')}/g</span>
                            <span style={{ color: '#15803d', fontWeight: 800 }}>
                              <strong>Eq. Pure:</strong> {(Number(t.amount_cash) / Number(t.applied_rate_per_gram)).toFixed(3)} g
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : Number(t.weight_grams) > 0 ? (
                      <div style={{ margin: '4px 0', padding: '5px 8px', background: t.category === 'GOLD' ? '#fffbe8' : t.category === 'SILVER' ? '#f8fafc' : '#f0f9ff', borderRadius: '8px', border: t.category === 'GOLD' ? '1px solid #fde68a' : t.category === 'SILVER' ? '1px solid #cbd5e1' : '1px solid #bae6fd' }}>
                        {/* Item Name */}
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{t.category === 'GOLD' ? '🥇' : t.category === 'SILVER' ? '🥈' : '👑'}</span>
                          <span>{toSentenceCase(t.item_name || (t.category === 'GOLD' ? 'Raw Gold Bar' : t.category === 'SILVER' ? 'Raw Silver Bar' : 'Ornament Item'))}</span>
                        </div>

                        {/* Detailed Metrics Grid (Strict 100% Fine Metal) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '4px', fontSize: '0.70rem', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>GROSS WT</span>
                            <strong style={{ color: '#0f172a' }}>{weight.toFixed(3)} g</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>TOUNCH</span>
                            <strong style={{ color: t.category === 'GOLD' ? '#b45309' : t.category === 'SILVER' ? '#475569' : '#0369a1' }}>{touch}%</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>100% PURE</span>
                            <strong style={{ color: '#15803d' }}>
                              {fineGold.toFixed(3)} g
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : null}

                      {/* Notes / Plain Text Message */}
                      {t.notes && (
                        Number(t.weight_grams) > 0 ? (
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.70rem', color: '#334155', fontStyle: 'italic', background: 'rgba(0,0,0,0.03)', padding: '3px 6px', borderRadius: '4px' }}>
                            "{t.notes}"
                          </p>
                        ) : (
                          <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, marginTop: '2px', wordBreak: 'break-word' }}>
                            {t.notes}
                          </div>
                        )
                      )}

                    {/* Photo Thumbnails with Full-Screen Expand & Share */}
                    {t.photos && t.photos.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {t.photos.map((url, idx) => (
                          <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                              src={url}
                              alt="Transaction Photo"
                              style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                              onClick={() => setPreviewImageData({ url, title: `${t.item_name || 'Transaction Photo'} (${t.category})` })}
                              title="Click to view full screen & share"
                            />
                            <span
                              onClick={() => setPreviewImageData({ url, title: `${t.item_name || 'Transaction Photo'} (${t.category})` })}
                              style={{ position: 'absolute', bottom: '3px', right: '3px', background: 'rgba(0,0,0,0.65)', color: '#ffffff', fontSize: '0.62rem', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <i className="fa-solid fa-expand"></i>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    </>
                    )}
                    {/* Message Footer: Timestamp, Edit Badge, Status Ticks at Bottom Right */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px', fontSize: '0.60rem', color: '#64748b' }}>
                      {t.edited_at_history && t.edited_at_history.length > 0 && !t.is_deleted && (
                        <span
                          style={{ fontStyle: 'italic', color: '#94a3b8', cursor: 'pointer' }}
                          onClick={() => setHistoryTx(t)}
                          title="Click to view edit history"
                        >
                          (edited)
                        </span>
                      )}
                      <span>{new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      {isOutgoing && (
                        <span className="wa-status-ticks" style={{ marginLeft: '2px', display: 'inline-flex', alignItems: 'center' }}>
                          {t.status_state === 'FAILED' ? (
                            <span className="wa-failed-badge" title="Sending failed">
                              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '0.70rem' }} />
                            </span>
                          ) : t.status_state === 'SENDING' ? (
                            <i className="fa-solid fa-clock" style={{ color: '#94a3b8', fontSize: '0.70rem' }} title="Sending..." />
                          ) : t.status_state === 'READ' || t.is_seen === 'YES' || t.read_at || t.seen_at ? (
                            <i className="fa-solid fa-check-double" style={{ color: '#0284c7', fontSize: '0.75rem' }} title="Seen by Worker (Blue tick)" />
                          ) : (
                            <i className="fa-solid fa-check-double" style={{ color: '#94a3b8', fontSize: '0.75rem' }} title="Delivered to Worker" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          });
        })()
      )}
          <div ref={chatBottomRef} />
        </div>

        {/* ── ACCORDION EXPAND/COLLAPSE DRAWER HEADER ── */}
        <div style={{ background: '#ffffff', borderTop: '1px solid #cbd5e1' }}>
          <div
            onClick={() => setIsAccordionExpanded(!isAccordionExpanded)}
            style={{
              padding: '0.55rem 1.25rem',
              background: isAccordionExpanded ? '#f8fafc' : '#ffffff',
              borderBottom: isAccordionExpanded ? '1px solid #e2e8f0' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-square-plus" style={{ color: '#075e54', fontSize: '0.95rem' }}></i>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                {isAccordionExpanded ? 'New Transaction & Live Preview Panel' : 'Add New Transaction / Record (Click to Expand Form)'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                {isAccordionExpanded ? 'Collapse Form (View Full Chat)' : 'Expand Form'}
              </span>
              <i className={`fa-solid fa-chevron-${isAccordionExpanded ? 'down' : 'up'}`} style={{ color: '#075e54', fontSize: '0.85rem' }}></i>
            </div>
          </div>

          {/* ── ACCORDION BODY (LIVE PREVIEW & FORM INPUTS) ── */}
          {isAccordionExpanded && (
            <form onSubmit={handleSendTransaction} style={{ padding: '0.85rem 1.25rem' }}>

              {/* Quoted Message Reply Preview Banner */}
              {replyTo && (
                <div style={{ background: '#f1f5f9', borderLeft: '4px solid #0284c7', padding: '8px 12px', borderRadius: '8px', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-solid fa-reply"></i> Replying to {replyTo.senderName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {replyTo.notes || (replyTo.photos && replyTo.photos.length > 0 ? '📷 Photo Attachment' : 'Message')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', padding: '4px' }}
                    title="Cancel reply"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}

              {/* Live Message Preview Banner (Toggleable ON/OFF) */}
              {isMessagePreviewEnabled && (
                <div className="worker-chat-live-preview" style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px dashed #0284c7', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-solid fa-eye"></i> Live Message Preview ({direction === 'OUTGOING' ? 'Sending to Worker' : 'Receiving from Worker'})
                    </span>
                    <button
                      type="button"
                      onClick={toggleMessagePreview}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                      title="Click to hide message preview"
                    >
                      <i className="fa-solid fa-eye-slash"></i> Disable Preview
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: direction === 'OUTGOING' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ width: '85%', maxWidth: '420px', background: '#ffffff', borderRadius: '12px', padding: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', background: direction === 'OUTGOING' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#0284c7', color: '#fff', textTransform: 'uppercase' }}>
                          {direction === 'OUTGOING' ? 'OUTGOING (STORE → WORKER)' : 'INCOMING (WORKER → STORE)'}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Now</span>
                      </div>

                      {/* Photo Attachment Mode Header or Category Breakdown */}
                      {photos && photos.length > 0 && !amountCash && !weightGrams ? (
                        <div style={{ margin: '4px 0', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                          <div style={{ fontSize: '0.65rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i> PHOTO ATTACHMENT
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                            {toSentenceCase(itemName.trim()) || 'Photo Attachment'}
                          </div>
                        </div>
                      ) : category === 'CASH' ? (
                        <div style={{ margin: '4px 0', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                            <span>CASH PAYMENT</span>
                            <span style={{ fontSize: '0.60rem', color: '#15803d' }}>
                              {cashMetalLink === 'FOR_GOLD' ? '🥇 For Gold' : cashMetalLink === 'FOR_SILVER' ? '🥈 For Silver' : '💵 General'}
                            </span>
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>
                            💵 ₹{amountCash ? Number(amountCash).toLocaleString('en-IN') : '0'}
                          </div>
                          {Number(amountCash) > 0 && Number(appliedRatePerGram) > 0 && (
                            <div style={{ marginTop: '3px', fontSize: '0.68rem', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Rate: ₹{Number(appliedRatePerGram).toLocaleString('en-IN')}/g</span>
                              <strong style={{ color: '#15803d' }}>Eq: {(Number(amountCash) / Number(appliedRatePerGram)).toFixed(3)} g</strong>
                            </div>
                          )}
                        </div>
                      ) : Number(weightGrams) > 0 ? (
                        <div style={{ margin: '4px 0', padding: '6px 10px', background: category === 'GOLD' ? '#fffbe8' : category === 'SILVER' ? '#f8fafc' : '#f0f9ff', borderRadius: '8px', border: category === 'GOLD' ? '1px solid #fde68a' : category === 'SILVER' ? '1px solid #cbd5e1' : '1px solid #bae6fd' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                            {category === 'GOLD' ? '🥇' : category === 'SILVER' ? '🥈' : '👑'}{' '}
                            {toSentenceCase(itemName.trim()) || (category === 'GOLD' ? 'Raw Gold Bar' : category === 'SILVER' ? 'Raw Silver Bar' : 'Ornament Item')}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '4px', fontSize: '0.72rem', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <div>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>GROSS WT</span>
                              <strong>{weightGrams ? Number(weightGrams).toFixed(3) : '0.000'} g</strong>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>TOUNCH %</span>
                              <strong>{touchPercentage || (category === 'SILVER' ? '80.0' : '91.6')}%</strong>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>100% PURE FINE</span>
                              <strong style={{ color: '#15803d' }}>
                                {Number((Number(weightGrams) || 0) * (Number(touchPercentage) || (category === 'SILVER' ? 80.0 : 91.6)) / 100).toFixed(3)} g
                              </strong>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {notes && (
                        <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, marginTop: '2px', wordBreak: 'break-word' }}>
                          {notes}
                        </div>
                      )}

                      {/* Photo Thumbnails Preview in Live Preview Banner */}
                      {photos && photos.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {photos.map((url, idx) => (
                            <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                              <img
                                src={url}
                                alt="Selected Photo Preview"
                                style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #0284c7', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotos((prev) => prev.filter((_, i) => i !== idx));
                                  setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '-5px',
                                  right: '-5px',
                                  background: '#dc2626',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                }}
                                title="Remove this photo"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle Mode & Category Dropdown */}
              <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <button
                    type="button"
                    onClick={() => setDirection('OUTGOING')}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: direction === 'OUTGOING' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'transparent', color: direction === 'OUTGOING' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    📤 Outgoing (Send)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('INCOMING')}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: direction === 'INCOMING' ? '#0284c7' : 'transparent', color: direction === 'INCOMING' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    📥 Incoming (Receive)
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
                    Metal Category:
                  </label> */}
                  <select
                    value={category}
                    onChange={(e) => {
                      const cat = e.target.value as 'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT';
                      setCategory(cat);
                      if (cat === 'SILVER') setTouchPercentage('80.0');
                      if (cat === 'GOLD') setTouchPercentage('91.6');
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      outline: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <option value="GOLD">🥇 Gold</option>
                    <option value="SILVER">🥈 Silver</option>
                    <option value="CASH">💵 Cash</option>
                    <option value="ORNAMENT">👑 Ornament</option>
                    <option value="CHAT">💬 Plain Message</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Parameter Inputs with Field Labels in Start Case */}
              <div style={{ display: 'grid', gridTemplateColumns: category === 'CHAT' ? '1fr auto' : category === 'CASH' ? '1.2fr 1.4fr 1.2fr 1.5fr auto' : '1.2fr 1fr 1fr 1.5fr auto', gap: '0.65rem', alignItems: 'flex-end' }}>

                {category === 'CHAT' ? null : category === 'CASH' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="Amount Cash (₹)..."
                        value={amountCash}
                        onChange={(e) => setAmountCash(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                        Purpose
                      </label>
                      <select
                        value={cashMetalLink}
                        onChange={(e) => setCashMetalLink(e.target.value as 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH')}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 700 }}
                      >
                        <option value="FOR_GOLD">For Gold</option>
                        <option value="FOR_SILVER">For Silver</option>
                        <option value="GENERAL_CASH">General Cash</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                        Rate per grm
                      </label>
                      <input
                        type="number"
                        placeholder="eg 14500"
                        value={appliedRatePerGram}
                        onChange={(e) => setAppliedRatePerGram(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                        🏷️ Item Name
                      </label>
                      <input
                        type="text"
                        placeholder={category === 'ORNAMENT' ? 'Ornament Name...' : 'Gold Item...'}
                        value={itemName}
                        autoCapitalize="sentences"
                        onChange={(e) => setItemName(toSentenceCase(e.target.value))}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                        Weight
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Weight (g)..."
                        value={weightGrams}
                        onChange={(e) => setWeightGrams(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                        Touch (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Touch %"
                        value={touchPercentage}
                        onChange={(e) => setTouchPercentage(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={notes}
                    autoCapitalize="sentences"
                    onChange={(e) => setNotes(toSentenceCase(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                {/* Photo attachment & Send Button */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Photos"
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: isSending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: isSending ? 0.6 : 1,
                    }}
                  >
                    <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i>
                    {photos.length > 0 && <span style={{ background: '#d97706', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem' }}>{photos.length}</span>}
                  </button>

                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />

                  <button
                    type="submit"
                    disabled={isSending}
                    style={{
                      padding: '0.55rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSending
                        ? '#94a3b8'
                        : direction === 'OUTGOING'
                          ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                          : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: isSending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isSending ? 0.85 : 1,
                      boxShadow: isSending
                        ? 'none'
                        : direction === 'OUTGOING'
                          ? '0 2px 8px rgba(234, 88, 12, 0.3)'
                          : '0 2px 8px rgba(2, 132, 199, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSending ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '0.88rem' }}></i>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
      )}

      {/* ── WORKER PROFILE INFORMATION DIALOG MODAL (WITH EDIT & PHOTO UPLOAD) ── */}
      {showWorkerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-id-card" style={{ color: '#d97706' }}></i>
                {isEditingWorker ? 'Edit Worker Profile' : 'Worker Profile Information'}
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkerModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Hidden Profile Photo Input Picker */}
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoUpload}
              style={{ display: 'none' }}
            />

            {!isEditingWorker ? (
              /* ── VIEW MODE ── */
              <>
                {/* Worker Avatar & Name Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  {worker.photo_url ? (
                    <img
                      src={worker.photo_url}
                      alt={worker.name}
                      onClick={() => setPreviewImageData({ url: worker.photo_url, title: `${worker.name} Profile Picture` })}
                      style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #d97706', boxShadow: '0 3px 10px rgba(180, 83, 9, 0.3)', cursor: 'pointer', flexShrink: 0 }}
                      title="Click to view full profile photo"
                    />
                  ) : (
                    <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', boxShadow: '0 3px 10px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}>
                      {worker.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {worker.name}
                      <span style={{ fontSize: '0.72rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>{worker.id}</span>
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>
                      🛠️ {worker.specialization || 'Goldsmith Artisan'}
                    </span>
                  </div>
                </div>

                {/* Detailed Information Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>📞 Phone Number:</span>
                    <strong style={{ color: '#0f172a' }}>{worker.phone || 'N/A'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>📍 Address:</span>
                    <strong style={{ color: '#0f172a' }}>{worker.address || 'Siddipet'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>📦 Assigned Orders:</span>
                    <strong style={{ color: '#d97706' }}>{worker.assigned_orders_count || 0} Orders</strong>
                  </div>

                  {worker.notes && (
                    <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>📝 Notes & Remarks:</span>
                      <span style={{ color: '#334155', fontStyle: 'italic' }}>"{worker.notes}"</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingWorker(true)}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fa-solid fa-pen-to-square"></i> Edit Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWorkerModal(false)}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              /* ── EDIT FORM MODE ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {/* Profile Photo Picker Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem' }}>
                  {editPhotoUrl ? (
                    <img
                      src={editPhotoUrl}
                      alt="Preview"
                      style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#cbd5e1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0 }}>
                      {editName ? editName.charAt(0) : '?'}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                      Profile Avatar / Photo
                    </label>
                    <button
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #0284c7', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <i className="fa-solid fa-camera"></i> Change / Upload Photo
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Worker Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Worker Name..."
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Phone..."
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      placeholder="Goldsmith Artisan..."
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Address / Location..."
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Notes & Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add worker remarks..."
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingWorker(false)}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSavingWorker}
                    onClick={handleSaveWorkerProfile}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fa-solid fa-floppy-disk"></i> {isSavingWorker ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
