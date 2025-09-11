#!/usr/bin/env python3
"""
Debug script to check college data
"""
import sys
import os

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def check_college_data():
    """Check what's in the colleges table"""
    try:
        from src.database import get_db_connection
        
        print("🔍 Checking College Data in Database...")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check all colleges
        cursor.execute('SELECT id, name, location, created_at FROM colleges ORDER BY name, id')
        colleges = cursor.fetchall()
        
        print(f"📊 Found {len(colleges)} college records:")
        print("-" * 80)
        print(f"{'ID':<3} {'Name':<30} {'Location':<15} {'Created At':<20}")
        print("-" * 80)
        
        for college in colleges:
            print(f"{college['id']:<3} {college['name']:<30} {college['location']:<15} {str(college['created_at']):<20}")
        
        print("-" * 80)
        
        # Check for duplicate names
        cursor.execute('''
            SELECT name, COUNT(*) as count
            FROM colleges
            GROUP BY name
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        ''')
        duplicates = cursor.fetchall()
        
        if duplicates:
            print(f"\n❌ Found {len(duplicates)} college names with duplicates:")
            for dup in duplicates:
                print(f"   • '{dup['name']}' appears {dup['count']} times")
        else:
            print("\n✅ No duplicate college names found")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error checking data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 College Data Debug")
    print("=" * 50)
    
    check_college_data()
    
    print("\n" + "=" * 50)
    print("🎯 Debug Complete!")


