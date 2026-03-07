import random
import string
from django.db import models
from django.contrib.auth.models import User

def generate_unique_code():
    while True:
        code = ''.join(random.choices(string.digits, k=4))
        if not PrintJob.objects.filter(access_code=code).exists():
            return code

class PrintJob(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
        ('PRINTING', 'Printing'),
        ('COMPLETED', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    file = models.FileField(upload_to='documents/')
    access_code = models.CharField(max_length=4, unique=True, default=generate_unique_code)
    copies = models.PositiveIntegerField(default=1)
    is_color = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Job {self.access_code} ({self.status})"
