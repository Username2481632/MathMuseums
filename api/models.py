from django.db import models
from authentication.models import User

# Create your models here.

class ConceptTile(models.Model):
    CONCEPT_CHOICES = [
        ('linear', 'Linear'),
        ('quadratic', 'Quadratic'),
        ('cubic', 'Cubic'),
        ('sqrt', 'Square Root'),
        ('cbrt', 'Cube Root'),
        ('abs', 'Absolute Value'),
        ('rational', 'Rational/Inverse'),
        ('exponential', 'Exponential'),
        ('logarithmic', 'Logarithmic'),
        ('trigonometric', 'Trigonometric'),
        ('piecewise', 'Piecewise'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='concept_tiles')
    concept_type = models.CharField(max_length=20, choices=CONCEPT_CHOICES)
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=250)
    height = models.IntegerField(default=200)
    desmos_state = models.JSONField(default=dict)  # Stores Desmos calculator state
    description = models.TextField(blank=True)
    is_complete = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'concept_type')

    def __str__(self):
        return f"{self.user.email} - {self.get_concept_type_display()}"

class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    onboarding_disabled = models.BooleanField(default=False)
    theme = models.CharField(max_length=20, default='light')
    # Add more preferences as needed

    def __str__(self):
        return f"Preferences for {self.user.email}"
