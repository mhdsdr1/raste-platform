import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';

export default function AppealPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appealText, setAppealText] = useState('');
  const [appealAttachment, setAppealAttachment] = useState(null);
  const [appealLoading, setAppealLoading] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState(1);

  useEffect(() => {
    api.get(`/shops/products/${id}/appeal-detail/`).then(res => {
      setProduct(res.data);
    }).catch(() => {
      toast.error('اعتراض یافت نشد');
    }).finally(() => setLoading(false));
    
    api.get('/shops/settings/').then(res => {
      setMaxFileSize(res.data.appeal_max_file_size_mb || 1);
    }).catch(() => {});
  }, [id]);

  const submitAppeal = async () => {
    if (!appealText.trim()) { toast.error('متن اعتراض الزامی'); return; }
    setAppealLoading(true);
    try {
      const formData = new FormData();
      formData.append('appeal_text', appealText);
      if (appealAttachment) formData.append('appeal_attachment', appealAttachment);
      await api.post(`/shops/products/${id}/appeal/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('اعتراض شما ثبت شد');
      navigate('/seller/products');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'خطا');
    } finally {
      setAppealLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">در حال بارگذاری...</div></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><div className="text-red-500">اعتراض یافت نشد</div></div>;

  const isAlreadyAppealed = product.appeal_status === 'pending';
  const hasAdminResponse = !!product.admin_response;

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/seller/products" className="text-xs text-gray-500 hover:text-pink-600">← محصولات</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">📩 اعتراض به آگهی</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 py-4">
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          {/* متن آگهی */}
          <div className="bg-gray-50 rounded-lg p-2 text-[11px] border">
            <p className="font-bold text-gray-800">📝 عنوان:</p>
            <p className="text-gray-700">{product.title}</p>
            {product.description && (
              <>
                <p className="font-bold text-gray-800 mt-2">📄 توضیحات:</p>
                <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
              </>
            )}
          </div>

          {/* دلیل رد */}
          <div className="bg-red-50 rounded-lg p-2 text-[11px] border border-red-200">
            <p className="font-bold text-red-700">دلیل رد: <span className="font-normal">استفاده از عبارات ممنوع</span></p>
          </div>

          {/* راهنما */}
          <div className="bg-blue-50 rounded-lg p-2 text-[10px] border border-blue-200 text-blue-800">
            اگر قصد استفاده از عبارت خاصی در آگهی‌های خود دارید و اشتباهاً رد می‌شود، می‌توانید جهت بررسی و اخذ تاییدیه به مدیر درخواست بزنید.
          </div>

          {/* پاسخ ادمین */}
          {hasAdminResponse && (
            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
              <p className="text-[10px] text-green-700 font-bold mb-1">📩 پاسخ مدیر:</p>
              <p className="text-xs text-green-800 whitespace-pre-wrap">{product.admin_response}</p>
              {product.admin_attachment_url && (
                <a href={product.admin_attachment_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-600 underline mt-1 block">📎 دانلود فایل</a>
              )}
            </div>
          )}

          {/* متن اعتراض قبلی */}
          {product.appeal_text && (
            <div className="bg-pink-50 rounded-lg p-2 border border-pink-200">
              <p className="text-[10px] text-pink-700 font-bold mb-1">📝 اعتراض قبلی شما:</p>
              <p className="text-xs text-pink-800 whitespace-pre-wrap">{product.appeal_text}</p>
              {product.appeal_attachment_url && (
                <a href={product.appeal_attachment_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-pink-600 underline mt-1 block">📎 فایل پیوست شما</a>
              )}
            </div>
          )}

          {/* اگه در انتظار بررسیه */}
          {isAlreadyAppealed && (
            <div className="bg-orange-50 rounded-lg p-2 border border-orange-200 text-center">
              <p className="text-xs text-orange-700 font-bold">⏳ اعتراض شما در حال بررسی است</p>
            </div>
          )}

          {/* اگه هنوز اعتراض نکرده یا میخواد دوباره بفرسته */}
          {(!isAlreadyAppealed) && (
            <>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">متن درخواست</label>
                <textarea
                  value={appealText}
                  onChange={e => setAppealText(e.target.value)}
                  rows={4}
                  placeholder="توضیح دهید چرا این آگهی مجاز است"
                  className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
                />
                {product.allow_appeal_attachment && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <label className="cursor-pointer text-pink-600 text-xs font-bold flex items-center gap-1">
                      📎 پیوست مدارک
                      <input
                        type="file"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file && file.size > product.appeal_attachment_max_size_mb * 1024 * 1024) {
                            toast.error(`حجم فایل نباید بیشتر از ${product.appeal_attachment_max_size_mb} مگابایت باشد`);
                            return;
                          }
                          setAppealAttachment(file || null);
                        }}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                      />
                    </label>
                    <span className="text-[9px] text-gray-400">(حداکثر {product.appeal_attachment_max_size_mb} مگابایت)</span>
                    {appealAttachment && <span className="text-[10px] text-green-600">✅ {appealAttachment.name}</span>}
                  </div>
                )}
              </div>

              <button
                onClick={submitAppeal}
                disabled={appealLoading}
                className="w-full bg-pink-500 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {appealLoading ? '...' : (hasAdminResponse ? '✓ ارسال مدارک' : '✓ ثبت اعتراض')}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
