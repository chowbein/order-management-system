"""
Main test file that imports all test modules.
Run tests with: python manage.py test api
"""
from django.test import TestCase

# Import all test modules
from .test_models import *
from .test_views import *
from .test_edge_cases import *
