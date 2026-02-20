import requests
import sys
from datetime import datetime

class Sus10APITester:
    def __init__(self, base_url="https://sustainability-ai-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200] if response.text else 'No response'
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:100]}...")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                'test': name,
                'expected': expected_status,
                'actual': 'ERROR',
                'response': str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoints(self):
        """Test basic health and root endpoints"""
        print("\n=== HEALTH & ROOT ENDPOINTS ===")
        
        # Root endpoint
        self.run_test("Root API", "GET", "api/", 200)
        
        # Health check
        self.run_test("Health Check", "GET", "api/health", 200)

    def test_stats_endpoint(self):
        """Test stats/overview endpoint"""
        print("\n=== STATS ENDPOINTS ===")
        
        success, data = self.run_test("Stats Overview", "GET", "api/stats/overview", 200)
        if success and data:
            required_fields = ['buildings_analyzed', 'active_providers', 'community_initiatives']
            for field in required_fields:
                if field in data:
                    print(f"   ✓ {field}: {data[field]}")
                else:
                    print(f"   ⚠ Missing field: {field}")

    def test_buildings_endpoints(self):
        """Test building-related endpoints"""
        print("\n=== BUILDINGS ENDPOINTS ===")
        
        # Search buildings
        success, buildings = self.run_test("Buildings Search", "GET", "api/buildings/search?limit=5", 200)
        
        if success and buildings and len(buildings) > 0:
            building_id = buildings[0].get('building_id')
            print(f"   Found {len(buildings)} buildings, testing with ID: {building_id}")
            
            if building_id:
                # Test individual building
                self.run_test("Building Detail", "GET", f"api/buildings/{building_id}", 200)
                
                # Test building solutions
                self.run_test("Building Solutions", "GET", f"api/buildings/{building_id}/solutions", 200)
                
                # Test building report
                self.run_test("Building Report", "GET", f"api/buildings/{building_id}/report", 200)
        else:
            print("   ⚠ No buildings found or search failed")

        # Test search with filters
        self.run_test("Buildings Search with City Filter", "GET", "api/buildings/search?city=Delhi&limit=3", 200)
        self.run_test("Buildings Search with Type Filter", "GET", "api/buildings/search?building_type=it_park&limit=3", 200)

    def test_providers_endpoints(self):
        """Test provider-related endpoints"""
        print("\n=== PROVIDERS ENDPOINTS ===")
        
        # List providers
        success, providers = self.run_test("Providers List", "GET", "api/providers?limit=10", 200)
        
        if success and providers and len(providers) > 0:
            provider_id = providers[0].get('provider_id')
            print(f"   Found {len(providers)} providers, testing with ID: {provider_id}")
            
            if provider_id:
                # Test individual provider
                self.run_test("Provider Detail", "GET", f"api/providers/{provider_id}", 200)
        else:
            print("   ⚠ No providers found or list failed")

        # Test provider filters
        self.run_test("Providers with City Filter", "GET", "api/providers?city=Delhi&limit=5", 200)
        self.run_test("Providers with Rating Filter", "GET", "api/providers?rating=4.0&limit=5", 200)

    def test_initiatives_endpoints(self):
        """Test initiative-related endpoints"""
        print("\n=== INITIATIVES ENDPOINTS ===")
        
        # List initiatives
        success, initiatives = self.run_test("Initiatives List", "GET", "api/initiatives?limit=10", 200)
        
        if success and initiatives and len(initiatives) > 0:
            initiative_id = initiatives[0].get('initiative_id')
            print(f"   Found {len(initiatives)} initiatives, testing with ID: {initiative_id}")
            
            if initiative_id:
                # Test individual initiative
                self.run_test("Initiative Detail", "GET", f"api/initiatives/{initiative_id}", 200)
                
                # Test initiative progress
                self.run_test("Initiative Progress", "GET", f"api/initiatives/{initiative_id}/progress", 200)
        else:
            print("   ⚠ No initiatives found or list failed")

        # Test initiative filters
        self.run_test("Initiatives with Type Filter", "GET", "api/initiatives?initiative_type=community&limit=5", 200)
        self.run_test("Initiatives with Area Filter", "GET", "api/initiatives?area=Delhi&limit=5", 200)

    def test_feature_flags_endpoint(self):
        """Test feature flags endpoint"""
        print("\n=== FEATURE FLAGS ENDPOINTS ===")
        
        success, flags = self.run_test("Feature Flags List", "GET", "api/feature-flags", 200)
        if success and flags:
            print(f"   Found {len(flags)} feature flags")
            for flag in flags:
                print(f"   - {flag.get('name', 'unknown')}: {flag.get('is_enabled', False)}")
                
            # Check specific flags required by the test
            blog_flag = next((f for f in flags if f.get('name') == 'blog'), None)
            if blog_flag:
                print(f"   ✓ Blog flag found: enabled = {blog_flag.get('is_enabled')}")
                if blog_flag.get('is_enabled'):
                    print("   ✓ Blog feature is enabled - can test blog endpoints")
                else:
                    print("   ⚠ Blog feature is disabled - blog endpoints will return 404")

    def test_blog_endpoints(self):
        """Test blog-related endpoints"""
        print("\n=== BLOG ENDPOINTS ===")
        
        # Check if blog feature is enabled first
        success, flags = self.run_test("Check Feature Flags for Blog", "GET", "api/feature-flags", 200)
        blog_enabled = False
        if success and flags:
            blog_flag = next((f for f in flags if f.get('name') == 'blog'), None)
            blog_enabled = blog_flag.get('is_enabled', False) if blog_flag else False
            
        if not blog_enabled:
            print("   ⚠ Blog feature is disabled, skipping blog tests")
            return
            
        # Test blog posts list
        success, posts = self.run_test("Blog Posts List", "GET", "api/blog/posts", 200)
        if success and posts:
            print(f"   ✓ Found {len(posts)} blog posts")
            for post in posts[:2]:  # Show first 2 posts
                print(f"   - {post.get('title', 'Unknown')}: {post.get('category', 'no category')}")
                
            # Test with category filter
            self.run_test("Blog Posts - Guides Category", "GET", "api/blog/posts?category=guides", 200)
            self.run_test("Blog Posts - Case Studies Category", "GET", "api/blog/posts?category=case-studies", 200)
            self.run_test("Blog Posts - News Category", "GET", "api/blog/posts?category=news", 200)
            
            # Test individual post if available
            if len(posts) > 0 and posts[0].get('slug'):
                slug = posts[0]['slug']
                self.run_test("Blog Post Detail", "GET", f"api/blog/posts/{slug}", 200)
        else:
            print("   ⚠ No blog posts found or API failed")

    def test_solution_types_endpoint(self):
        """Test solution types endpoint"""
        print("\n=== SOLUTION TYPES ENDPOINTS ===")
        
        success, solution_types = self.run_test("Solution Types List", "GET", "api/solution-types", 200)
        if success and solution_types:
            print(f"   Found {len(solution_types)} solution types")
            
            if len(solution_types) > 0:
                sol_type_id = solution_types[0].get('solution_type_id')
                if sol_type_id:
                    self.run_test("Solution Type Detail", "GET", f"api/solution-types/{sol_type_id}", 200)

        # Test with category filter
        self.run_test("Solution Types with Category Filter", "GET", "api/solution-types?category=greening", 200)

    def test_seed_data_endpoint(self):
        """Test seed data endpoint (should show already seeded)"""
        print("\n=== SEED DATA ENDPOINT ===")
        
        # This should return "already seeded" message since data exists
        self.run_test("Seed Data Check", "POST", "api/admin/seed-data", 200)

    def print_results(self):
        """Print comprehensive test results"""
        print(f"\n{'='*60}")
        print(f"📊 BACKEND API TEST RESULTS")
        print(f"{'='*60}")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                print(f"   Response: {test['response']}")
        
        print(f"\n{'='*60}")
        return len(self.failed_tests) == 0

def main():
    print("🚀 Starting Sus10 AI Backend API Tests")
    print("=" * 60)
    
    tester = Sus10APITester()
    
    # Run all test suites
    tester.test_health_endpoints()
    tester.test_stats_endpoint()
    tester.test_feature_flags_endpoint()
    tester.test_blog_endpoints()  # New test for blog functionality
    tester.test_solution_types_endpoint()
    tester.test_buildings_endpoints()
    tester.test_providers_endpoints()
    tester.test_initiatives_endpoints()
    tester.test_seed_data_endpoint()
    
    # Print final results
    all_passed = tester.print_results()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())