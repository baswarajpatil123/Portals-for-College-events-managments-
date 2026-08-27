"""
Tests for College Summary and Event Management API endpoints
"""
import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))


class TestCollegeSummaryAPI(unittest.TestCase):
    """Test suite for Portal API endpoints"""

    @classmethod
    def setUpClass(cls):
        try:
            from app import app
            cls.app = app
            cls.app.config['TESTING'] = True
            cls.client = cls.app.test_client()
        except ImportError:
            cls.app = None
            cls.client = None

    def setUp(self):
        if not self.client:
            self.skipTest("Flask or dependencies not installed in current environment")

    def test_pages_load(self):
        """Test admin portal and student app HTML routes load"""
        res_admin = self.client.get('/admin-portal')
        self.assertIn(res_admin.status_code, [200, 302])

        res_student = self.client.get('/student-app')
        self.assertIn(res_student.status_code, [200, 302])

    @patch('models.EventManager.get_events')
    def test_get_events_api(self, mock_get_events):
        """Test GET /api/events returns formatted event list"""
        mock_get_events.return_value = [
            {
                "id": "test-event-1",
                "title": "AI/ML Workshop",
                "event_type": "workshop",
                "college_id": 1,
                "college_name": "BRP College of Engineering",
                "status": "active"
            }
        ]
        response = self.client.get('/api/events')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['data']), 1)
        self.assertEqual(data['data'][0]['title'], "AI/ML Workshop")

    @patch('reports.ReportManager.event_popularity_report')
    def test_popularity_report_api(self, mock_popularity):
        """Test GET /api/reports/popularity returns popularity analytics"""
        mock_popularity.return_value = [
            {"title": "Hackathon 2025", "total_registrations": 50}
        ]
        response = self.client.get('/api/reports/popularity')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data'][0]['total_registrations'], 50)

    @patch('reports.ReportManager.student_participation_report')
    def test_participation_report_api(self, mock_participation):
        """Test GET /api/reports/participation returns student metrics"""
        mock_participation.return_value = [
            {"name": "Alice Johnson", "events_registered": 19, "attendance_rate": 80.0}
        ]
        response = self.client.get('/api/reports/participation')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data'][0]['name'], "Alice Johnson")


if __name__ == '__main__':
    unittest.main(verbosity=2)
