# Generated by Django 5.0.7 on 2025-05-20 12:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='otpcode',
            name='email',
            field=models.EmailField(max_length=254, verbose_name='email address'),
        ),
    ]
