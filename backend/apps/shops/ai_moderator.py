"""
سرویس بررسی خودکار محتوا با AI
- لایه ۱: AvalAI (OpenAI Moderation) - متن + عکس
- لایه ۲: کلمات ممنوعه (فال‌بک)
"""
import os
import requests
import base64
from django.conf import settings


# ═══ کلمات ممنوعه (فال‌بک سریع) ═══
FORBIDDEN_KEYWORDS = [
    # مواد مخدر
    'مواد مخدر', 'مخدر', 'تریاک', 'هروئین', 'کوکائین', 'ماریجوانا', 'گل', 'حشیش',
    'شیشه', 'کریستال', 'اکستازی', 'ال‌اس‌دی', 'متادون', 'کراک',
    # قاچاق
    'قاچاق', 'غیرمجاز', 'بدون مجوز',
    # محتوای جنسی
    'همبستر', 'سکس', 'رابطه جنسی', 'فاحشه', 'روسپی', 'لخت', 'برهنه',
    # سلاح
    'سلاح', 'کلت', 'کلاشینکف', 'فشنگ', 'مسلسل',
    # قمار
    'قمار', 'شرط‌بندی', 'پوکر', 'رولت',
]

SAFE_CATEGORIES = {
    'sexual': 0.5,        # حساسیت بالا
    'hate': 0.4,
    'violence': 0.6,      # متوسط (چاقوی آشپزخونه)
    'self-harm': 0.5,
    'illicit': 0.3,       # مواد مخدر - حساسیت خیلی بالا
}


def check_text_with_avalai(text):
    """بررسی متن با AvalAI (OpenAI Moderation)"""
    try:
        api_key = os.getenv('AVALAI_API_KEY', '')
        if not api_key:
            return {'status': 'skipped', 'reason': 'no_api_key'}
        
        response = requests.post(
            'https://api.avalai.ir/v1/moderations',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={'input': text},
            timeout=10
        )
        
        if response.status_code != 200:
            return {'status': 'error', 'reason': f'API error {response.status_code}'}
        
        data = response.json()
        result = data.get('results', [{}])[0]
        
        if result.get('flagged', False):
            return {'status': 'rejected', 'reason': 'محتوای نامناسب', 'details': result.get('categories', {})}
        
        # چک دسته‌های پرخطر
        categories = result.get('category_scores', {})
        for cat, threshold in SAFE_CATEGORIES.items():
            if categories.get(cat, 0) > threshold:
                return {'status': 'suspicious', 'reason': f'مشکوک: {cat}', 'details': categories}
        
        return {'status': 'safe'}
    except Exception as e:
        print('AvalAI error:', e)
        return {'status': 'error', 'reason': str(e)}


def check_text_with_keywords(text):
    """بررسی سریع با کلمات ممنوعه"""
    text_lower = text.lower()
    found = []
    for kw in FORBIDDEN_KEYWORDS:
        if kw.lower() in text_lower:
            found.append(kw)
    
    if found:
        return {'status': 'rejected', 'reason': f'کلمات ممنوعه: {", ".join(found)}', 'keywords': found}
    return {'status': 'safe'}


def check_image_with_nemotron(image_file):
    """بررسی عکس با Nemotron (اختیاری)"""
    try:
        api_key = os.getenv('HERMOUZ_API_KEY', '')
        if not api_key:
            return {'status': 'skipped', 'reason': 'no_api_key'}
        
        # تبدیل به base64
        img_data = base64.b64encode(image_file.read()).decode('utf-8')
        image_file.seek(0)
        
        response = requests.post(
            'https://api.hormouz.ai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'nvidia/nemotron-content-safety',
                'messages': [
                    {'role': 'user', 'content': [
                        {'type': 'text', 'text': 'Is this image safe? Reply with only: SAFE, UNSAFE_DRUGS, UNSAFE_SEXUAL, UNSAFE_VIOLENCE, or UNSAFE_OTHER'},
                        {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{img_data}'}}
                    ]}
                ],
                'max_tokens': 20,
            },
            timeout=15
        )
        
        if response.status_code != 200:
            return {'status': 'error', 'reason': f'API error {response.status_code}'}
        
        data = response.json()
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip().upper()
        
        if 'SAFE' in content and 'UNSAFE' not in content:
            return {'status': 'safe'}
        elif 'UNSAFE_DRUGS' in content or 'UNSAFE_SEXUAL' in content:
            return {'status': 'rejected', 'reason': 'تصویر نامناسب'}
        elif 'UNSAFE' in content:
            return {'status': 'suspicious', 'reason': 'تصویر مشکوک'}
        
        return {'status': 'safe'}
    except Exception as e:
        print('Nemotron error:', e)
        return {'status': 'error', 'reason': str(e)}


def moderate_product(title, description, image_file=None):
    """
    بررسی کامل یک محصول
    خروجی:
        {
            'status': 'approved' | 'rejected' | 'pending_review',
            'reason': 'دلیل',
            'layers': {layer_name: result}
        }
    """
    results = {}
    text = f"{title} {description}"
    
    # ═══ لایه ۱: کلمات ممنوعه (سریع) ═══
    kw_result = check_text_with_keywords(text)
    results['keywords'] = kw_result
    if kw_result['status'] == 'rejected':
        return {
            'status': 'rejected',
            'reason': kw_result['reason'],
            'layers': results,
        }
    
    # ═══ لایه ۲: AvalAI (متن) ═══
    if os.getenv('AVALAI_API_KEY'):
        avalai_result = check_text_with_avalai(text)
        results['avalai'] = avalai_result
        if avalai_result['status'] == 'rejected':
            return {
                'status': 'rejected',
                'reason': avalai_result['reason'],
                'layers': results,
            }
        if avalai_result['status'] == 'suspicious':
            return {
                'status': 'pending_review',
                'reason': avalai_result['reason'],
                'layers': results,
            }
    
    # ═══ لایه ۳: Nemotron (عکس) ═══
    if image_file and os.getenv('HERMOUZ_API_KEY'):
        try:
            img_result = check_image_with_nemotron(image_file)
            results['nemotron'] = img_result
            if img_result['status'] == 'rejected':
                return {
                    'status': 'rejected',
                    'reason': img_result['reason'],
                    'layers': results,
                }
            if img_result['status'] == 'suspicious':
                return {
                    'status': 'pending_review',
                    'reason': img_result['reason'],
                    'layers': results,
                }
        except Exception as e:
            print('Image check error:', e)
    
    # ═══ همه لایه‌ها ایمن ═══
    return {
        'status': 'approved',
        'reason': '',
        'layers': results,
    }
