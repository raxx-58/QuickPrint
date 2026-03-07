from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from .models import PrintJob

@ensure_csrf_cookie
def index(request):
    return render(request, 'index.html')

@require_POST
def upload_document(request):
    if request.FILES.get('file'):
        file = request.FILES['file']
        copies = int(request.POST.get('copies', 1))
        is_color = request.POST.get('is_color') == 'true'
        
        # Create user simulation or guest
        job = PrintJob.objects.create(
            file=file,
            copies=copies,
            is_color=is_color,
            status='PENDING' # Explicitly pending
        )
        return JsonResponse({'success': True, 'job_id': job.id})
    return JsonResponse({'success': False, 'error': 'No file uploaded'}, status=400)

@require_POST
def process_payment(request):
    job_id = request.POST.get('job_id')
    try:
        job = PrintJob.objects.get(id=job_id)
        # Mock payment success
        job.status = 'PAID'
        job.save()
        return JsonResponse({'success': True, 'access_code': job.access_code}) 
    except PrintJob.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Job not found'}, status=404)

def check_status(request, access_code):
    try:
        job = PrintJob.objects.get(access_code=access_code)
        # Simulating Printing status for demo if Paid
        if job.status == 'PAID':
            import random
            if random.random() > 0.5: # Randomly flip to Printing for demo effect
                job.status = 'PRINTING'
                job.save()
                
        return JsonResponse({'status': job.status})
    except PrintJob.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Invalid code'}, status=404)
