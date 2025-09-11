#!/usr/bin/env python3
"""
Comprehensive test for College Performance Summary API
"""
import requests
import json

def test_college_summary_api():
    """Test the College Performance Summary API endpoint"""
    try:
        print("🧪 Testing College Performance Summary API...")
        
        # Test the API endpoint
        response = requests.get('http://localhost:5000/api/reports/colleges')
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API endpoint working! Status: {data.get('success')}")
            
            colleges = data.get('data', [])
            print(f"📊 Found {len(colleges)} colleges in summary")
            
            if colleges:
                print("\n📋 College Performance Summary:")
                print("-" * 80)
                print(f"{'College Name':<25} {'Students':<8} {'Events':<7} {'Registrations':<13} {'Attendance':<10} {'Rate %':<8}")
                print("-" * 80)
                
                # Check for duplicates by college ID
                college_ids = set()
                duplicates_found = False
                
                for college in colleges:
                    college_id = college['id']
                    if college_id in college_ids:
                        duplicates_found = True
                        print(f"❌ DUPLICATE FOUND: College ID {college_id} appears multiple times!")
                    else:
                        college_ids.add(college_id)
                    
                    print(f"{college['college_name']:<25} {college['total_students']:<8} {college['total_events']:<7} {college['total_registrations']:<13} {college['total_attendance']:<10} {college['overall_attendance_rate']:<8}")
                
                print("-" * 80)
                
                if not duplicates_found:
                    print("✅ No duplicate entries found!")
                else:
                    print("❌ Duplicate entries detected!")
                
                # Validate data integrity
                print("\n🔍 Data Integrity Check:")
                for college in colleges:
                    name = college['college_name']
                    students = college['total_students']
                    events = college['total_events']
                    registrations = college['total_registrations']
                    attendance = college['total_attendance']
                    rate = college['overall_attendance_rate']
                    
                    # Check logical consistency
                    if attendance > registrations:
                        print(f"❌ {name}: Attendance ({attendance}) > Registrations ({registrations})")
                    elif rate < 0 or rate > 100:
                        print(f"❌ {name}: Invalid attendance rate ({rate}%)")
                    elif students < 0 or events < 0 or registrations < 0 or attendance < 0:
                        print(f"❌ {name}: Negative values detected")
                    else:
                        print(f"✅ {name}: Data integrity OK")
                
            else:
                print("ℹ️  No colleges found in summary")
                
        else:
            print(f"❌ API returned status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Please ensure the server is running:")
        print("   python run.py")
    except Exception as e:
        print(f"❌ Error testing API: {e}")

if __name__ == "__main__":
    print("🚀 Testing College Performance Summary API")
    print("=" * 60)
    
    test_college_summary_api()
    
    print("\n" + "=" * 60)
    print("🎯 API Test Complete!")
    print("\n💡 Next Steps:")
    print("   1. Visit: http://localhost:5000/admin-portal")
    print("   2. Go to 'Reports' section")
    print("   3. Check 'College Performance Summary'")
    print("   4. Verify no duplicate entries are shown")
    print("   5. Confirm accurate counts and percentages")
