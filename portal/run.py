"""
Entry point for Campus Event Management Platform
"""
import sys
import os

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.app import app
from src.database import init_database, load_sample_data

if __name__ == '__main__':
    print("🚀 Starting Campus Event Management Platform...")
    
    try:
        # Initialize database and load sample data
        print("📦 Initializing database...")
        init_database()
        
        print("📝 Loading sample data...")
        load_sample_data()
        
        print("🌐 Starting Flask server...")
        print("📍 API endpoints available at: http://localhost:5000/api/")
        print("📊 Health check: http://localhost:5000/api/health")
        print("🔄 Press Ctrl+C to stop the server")
        
        app.run(debug=True, host='0.0.0.0', port=5000)
        
    except Exception as e:
        print(f"\n❌ Failed to start application: {str(e)}")
        print("\n💡 Please run the verification script first:")
        print("   python verify_mysql_setup.py")
        print("\n🔧 Or check the troubleshooting guide in README.md")
        sys.exit(1)





