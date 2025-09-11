#!/usr/bin/env python3
"""
Script to clean up duplicate college data
"""
import sys
import os

# Add src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def cleanup_duplicate_colleges():
    """Clean up duplicate college records"""
    try:
        from src.database import get_db_connection
        
        print("🧹 Cleaning up duplicate college records...")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First, let's see what we have
        cursor.execute('SELECT COUNT(*) as count FROM colleges')
        total_count = cursor.fetchone()['count']
        print(f"📊 Total college records before cleanup: {total_count}")
        
        # Get unique college names and keep only the first occurrence
        cursor.execute('''
            SELECT name, MIN(id) as keep_id
            FROM colleges
            GROUP BY name
        ''')
        colleges_to_keep = cursor.fetchall()
        
        print(f"📋 Found {len(colleges_to_keep)} unique college names")
        
        # Delete duplicate colleges (keep only the first occurrence)
        for college in colleges_to_keep:
            college_name = college['name']
            keep_id = college['keep_id']
            
            # Delete all records with this name except the one we want to keep
            cursor.execute('''
                DELETE FROM colleges 
                WHERE name = %s AND id != %s
            ''', (college_name, keep_id))
            
            deleted_count = cursor.rowcount
            if deleted_count > 0:
                print(f"   🗑️  Deleted {deleted_count} duplicate records for '{college_name}'")
        
        # Check final count
        cursor.execute('SELECT COUNT(*) as count FROM colleges')
        final_count = cursor.fetchone()['count']
        print(f"📊 Total college records after cleanup: {final_count}")
        
        # Show final colleges
        cursor.execute('SELECT id, name, location FROM colleges ORDER BY name')
        final_colleges = cursor.fetchall()
        
        print("\n📋 Final college list:")
        print("-" * 60)
        print(f"{'ID':<3} {'Name':<30} {'Location':<15}")
        print("-" * 60)
        for college in final_colleges:
            print(f"{college['id']:<3} {college['name']:<30} {college['location']:<15}")
        print("-" * 60)
        
        conn.commit()
        conn.close()
        
        print("✅ Cleanup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 College Data Cleanup")
    print("=" * 50)
    
    cleanup_duplicate_colleges()
    
    print("\n" + "=" * 50)
    print("🎯 Cleanup Complete!")


