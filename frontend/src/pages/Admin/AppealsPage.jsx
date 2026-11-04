import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';

export default function AppealsPage() {
  const [appeals, setAppeals] = useState([]);
  const [adminResponse, setAdminResponse] = useState('');
  const [adminAttachment, setAdminAttachment] = useState(null);
  const [allowAttachment, setAllowAttachment] = useState(false);
  const [attachmentMaxSize, setAttachmentMaxSize] = useState(1);
  const [historyMessages, setHistoryMessages] = useState({});
  const [respondingTo, setRespondingTo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shops/appeals/');
      setAppeals(res.data.appeals || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAppeals(); }, []);

  const fetchHistory = async (productId) => {
    try {
      const res = await api.get(`/shops/products/${productId}/appeal-messages/`);
      setHistoryMessages(prev => ({ ...prev, [productId]: res.data.messages || [] }));
    } catch (e) { console.error(e); }
  };
  
  const review = async (id, action) => {
    try {
      const formData = new FormData();
      formData.append('action', action);
      if (adminResponse) formData.append('admin_response', adminResponse);
      formData.append('allow_appeal_attachment', allowAttachment ? 'true' : 'false');
      formData.append('appeal_attachment_max_size_mb', attachmentMaxSize);
      if (adminAttachment) formData.append('admin_attachment', adminAttachment);
      
      await api.patch(`/shops/appeals/${id}/review/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(action === 'accept' ? 'اعتراض پذیرفته شد' : 'اعتراض رد شد');
      setAdminResponse('');
      setAdminAttachment(null);
      setAllowAttachment(false);
      setAttachmentMaxSize(1);
      setRespondingTo(null);
      fetchAppeals();
    } catch (e) { 
      toast.error(e?.response?.data?.error || 'خطا'); 
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">📩 اعتراض‌ها</h1>
          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">{appeals.length}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">در حال بارگذاری...</div>
        ) : appeals.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border">
            <span className="text-3xl block mb-2">✅</span>
            هیچ اعتراضی در انتظار بررسی نیست
          </div>
        ) : (
          <div className="space-y-3">
            {appeals.map(a => (
              <div key={a.id} className="bg-white rounded-xl border shadow-sm p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{a.title}</p>
                    {a.image_url && (
                      <img 
                        src={a.image_url} 
                        alt={a.title}
                        className="mt-1 w-24 h-24 object-cover rounded-lg border cursor-pointer"
                        onClick={() => window.open(a.image_url, '_blank')}
                      />
                    )}
                    <p className="text-[10px] text-gray-500 mt-0.5">فروشگاه: {a.shop_name}</p>
                    {a.approval_status === 'pending_review' ? (
                      <p className="text-[10px] text-orange-600 mt-0.5">⏳ در انتظار بررسی: {a.rejection_reason || 'متن مشکوک'}</p>
                    ) : (
                      <p className="text-[10px] text-red-600 mt-0.5">دلیل رد: {a.rejection_reason || 'نامشخص'}</p>
                    )}
                  </div>
                </div>
                {a.appeal_text && (
                <div className="bg-pink-50 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-gray-500 mb-0.5">📝 متن اعتراض:</p>
                  <p className="text-xs text-gray-700">{a.appeal_text}</p>
                  {a.appeal_attachment_url && (
                    <a href={a.appeal_attachment_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-pink-600 font-bold underline mt-1 block">
                      📎 دانلود فایل پیوست فروشنده
                    </a>
                  )}
                </div>
                )}
                
                {/* تاریخچه مکالمه */}
                <div className="mb-2">
                  <button
                    onClick={() => {
                      if (historyMessages[a.id]) {
                        setHistoryMessages(prev => {
                          const copy = {...prev};
                          delete copy[a.id];
                          return copy;
                        });
                      } else {
                        fetchHistory(a.id);
                      }
                    }}
                    className="text-[10px] text-blue-600 font-bold"
                  >
                    {historyMessages[a.id] ? '▲ بستن تاریخچه' : '📜 مشاهده تاریخچه مکالمه'}
                  </button>
                  
                  {historyMessages[a.id] && (
                    <div className="mt-2 bg-gray-50 rounded-lg p-2 max-h-60 overflow-y-auto space-y-1.5">
                      {historyMessages[a.id].length === 0 ? (
                        <p className="text-[10px] text-gray-400 text-center py-2">پیامی وجود ندارد</p>
                      ) : (
                        historyMessages[a.id].map((m, idx) => (
                          <div
                            key={idx}
                            className={`rounded-lg p-2 text-[10px] ${
                              m.sender_type === 'admin' 
                                ? 'bg-green-50 border-r-2 border-green-500 mr-8' 
                                : 'bg-pink-50 border-r-2 border-pink-500 ml-8'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`font-bold ${m.sender_type === 'admin' ? 'text-green-700' : 'text-pink-700'}`}>
                                {m.sender_type === 'admin' ? '👨‍💼 ادمین' : '🏪 فروشنده'}
                              </span>
                              <span className="text-[8px] text-gray-400">
                                {new Date(m.created_at).toLocaleString('fa-IR')}
                              </span>
                            </div>
                            {m.message && <p className="text-gray-700 whitespace-pre-wrap">{m.message}</p>}
                            {m.attachment_url && (
                              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 underline mt-1 block">
                                📎 دانلود فایل
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {respondingTo === a.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={adminResponse}
                      onChange={e => setAdminResponse(e.target.value)}
                      rows={3}
                      placeholder="پاسخ خود را به فروشنده بنویسید (اختیاری)..."
                      className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
                    />

                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 space-y-2">
                      <label className="flex items-center gap-2 text-[11px] text-gray-700">
                        <input
                          type="checkbox"
                          checked={allowAttachment}
                          onChange={e => setAllowAttachment(e.target.checked)}
                        />
                        <span>فعال کردن پیوست فایل برای فروشنده</span>
                      </label>
                      {allowAttachment && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-gray-600">حداکثر حجم:</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={attachmentMaxSize}
                            onChange={e => setAttachmentMaxSize(Number(e.target.value))}
                            className="w-16 px-2 py-1 border rounded text-xs"
                          />
                          <span className="text-[10px] text-gray-500">MB</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            const formData = new FormData();
                            formData.append('action', 'respond');
                            if (adminResponse) formData.append('admin_response', adminResponse);
                            formData.append('allow_appeal_attachment', allowAttachment ? 'true' : 'false');
                            formData.append('appeal_attachment_max_size_mb', attachmentMaxSize);
                            await api.patch(`/shops/appeals/${a.id}/review/`, formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            toast.success('پاسخ ارسال شد');
                            setAdminResponse('');
                            setAllowAttachment(false);
                            setAttachmentMaxSize(1);
                            setRespondingTo(null);
                            fetchAppeals();
                          } catch (e) {
                            toast.error(e?.response?.data?.error || 'خطا');
                          }
                        }}
                        className="flex-1 bg-blue-500 text-white py-1.5 rounded-lg text-xs font-bold"
                      >
                        📤 ارسال پاسخ
                      </button>
                      <button onClick={() => { setRespondingTo(null); setAdminResponse(''); }} className="bg-gray-200 text-gray-600 px-3 rounded-lg text-xs font-bold">لغو</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => review(a.id, 'accept')} className="flex-1 bg-green-500 text-white py-1.5 rounded-lg text-xs font-bold">✅ تایید</button>
                    <button onClick={() => review(a.id, 'reject')} className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-xs font-bold">❌ رد</button>
                    <button onClick={() => setRespondingTo(a.id)} className="flex-1 bg-blue-500 text-white py-1.5 rounded-lg text-xs font-bold">📩 پاسخ</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
