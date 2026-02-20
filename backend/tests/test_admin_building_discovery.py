"""
Test Admin Building Discovery API - Backend Tests
Tests for /api/admin/buildings/discover endpoint

Test Features:
- Admin authentication required (401 for unauthenticated)
- Admin role required (403 for non-admin users)
- City parameter validation (400 if missing)
- Successful building discovery for supported cities
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestAdminBuildingDiscovery:
    """Admin Building Discovery endpoint tests"""
    
    # Store tokens for reuse
    admin_token = None
    non_admin_token = None

    @pytest.fixture(scope="class", autouse=True)
    def setup_test_users(self):
        """Create test users and sessions via MongoDB"""
        import subprocess
        import time
        
        # Create admin user session
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', '''
            use('test_database');
            var userId = 'test_admin_' + Date.now();
            var sessionToken = 'test_admin_session_' + Date.now();
            
            // Create admin user
            db.users.insertOne({
                user_id: userId,
                email: 'test_admin_discovery_' + Date.now() + '@test.com',
                name: 'Test Admin',
                user_type: 'admin',
                created_at: new Date()
            });
            
            // Create session
            db.user_sessions.insertOne({
                user_id: userId,
                session_token: sessionToken,
                expires_at: new Date(Date.now() + 60*60*1000),
                created_at: new Date()
            });
            
            print('ADMIN_TOKEN:' + sessionToken);
            '''
        ], capture_output=True, text=True)
        
        # Extract admin token
        for line in result.stdout.split('\n'):
            if 'ADMIN_TOKEN:' in line:
                TestAdminBuildingDiscovery.admin_token = line.split('ADMIN_TOKEN:')[1].strip()
                break
        
        # Create non-admin user session
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', '''
            use('test_database');
            var userId = 'test_user_' + Date.now();
            var sessionToken = 'test_user_session_' + Date.now();
            
            // Create regular user
            db.users.insertOne({
                user_id: userId,
                email: 'test_user_discovery_' + Date.now() + '@test.com',
                name: 'Test User',
                user_type: 'individual',
                created_at: new Date()
            });
            
            // Create session
            db.user_sessions.insertOne({
                user_id: userId,
                session_token: sessionToken,
                expires_at: new Date(Date.now() + 60*60*1000),
                created_at: new Date()
            });
            
            print('USER_TOKEN:' + sessionToken);
            '''
        ], capture_output=True, text=True)
        
        # Extract user token
        for line in result.stdout.split('\n'):
            if 'USER_TOKEN:' in line:
                TestAdminBuildingDiscovery.non_admin_token = line.split('USER_TOKEN:')[1].strip()
                break
        
        yield
        
        # Cleanup - delete test users and sessions
        subprocess.run([
            'mongosh', '--quiet', '--eval', '''
            use('test_database');
            db.users.deleteMany({email: /test_admin_discovery_|test_user_discovery_/});
            db.user_sessions.deleteMany({session_token: /test_admin_session_|test_user_session_/});
            db.buildings.deleteMany({building_id: /^bld_/, curated_by_admin_id: /^test_admin_/});
            '''
        ], capture_output=True, text=True)

    def test_discover_unauthenticated_returns_401(self):
        """Test that unauthenticated requests return 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            json={"city": "Gurugram"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Unauthenticated request returns 401")

    def test_discover_non_admin_returns_403(self):
        """Test that non-admin users get 403 Forbidden"""
        if not self.non_admin_token:
            pytest.skip("Non-admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.non_admin_token}"},
            json={"city": "Gurugram"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        assert "Admin access required" in data.get("detail", "")
        print("PASS: Non-admin user returns 403 with 'Admin access required' message")

    def test_discover_missing_city_returns_400(self):
        """Test that missing city parameter returns 400"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={}  # No city provided
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "City is required" in data.get("detail", "")
        print("PASS: Missing city returns 400 with 'City is required' message")

    def test_discover_unsupported_city_returns_400(self):
        """Test that unsupported city returns 400 with helpful error"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"city": "InvalidCity123"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "not supported" in data.get("detail", "").lower()
        print("PASS: Unsupported city returns 400 with helpful error message")

    def test_discover_gurugram_success(self):
        """Test successful discovery for Gurugram (supported city)"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "city": "Gurugram",
                "min_area": 5000,
                "limit": 3
            },
            timeout=120  # OSM API can be slow
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "discovered" in data, "Response should contain 'discovered' count"
        assert "imported" in data, "Response should contain 'imported' count"
        assert "skipped" in data, "Response should contain 'skipped' count"
        assert "buildings" in data, "Response should contain 'buildings' list"
        assert data["city"] == "Gurugram", "Response city should match request"
        print(f"PASS: Gurugram discovery successful - discovered={data['discovered']}, imported={data['imported']}")

    def test_discover_delhi_success(self):
        """Test successful discovery for Delhi"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "city": "Delhi",
                "min_area": 5000,
                "limit": 2
            },
            timeout=120
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["city"] == "Delhi"
        print(f"PASS: Delhi discovery successful - discovered={data['discovered']}, imported={data['imported']}")

    def test_discover_mumbai_success(self):
        """Test successful discovery for Mumbai"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "city": "Mumbai",
                "min_area": 3000,
                "limit": 2
            },
            timeout=120
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["city"] == "Mumbai"
        print(f"PASS: Mumbai discovery successful - discovered={data['discovered']}, imported={data['imported']}")

    def test_discover_with_building_type_filter(self):
        """Test discovery with building type filter"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "city": "Pune",
                "building_type": "hospital",
                "limit": 2
            },
            timeout=120
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["building_type"] == "hospital"
        print(f"PASS: Discovery with building_type filter works - discovered={data['discovered']}")

    def test_discover_response_structure(self):
        """Test that response has correct structure"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings/discover",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"city": "Noida", "limit": 1},
            timeout=120
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields
        required_fields = ["city", "building_type", "discovered", "imported", "skipped", "failed", "buildings"]
        for field in required_fields:
            assert field in data, f"Response missing required field: {field}"
        
        # Check buildings array structure if any imported
        if data["imported"] > 0 and len(data["buildings"]) > 0:
            building = data["buildings"][0]
            building_fields = ["building_id", "name", "type", "city", "footprint", "terrace"]
            for field in building_fields:
                assert field in building, f"Building missing required field: {field}"
        
        print("PASS: Response structure is correct")


class TestAdminBuildingsBasicCRUD:
    """Test admin building CRUD operations"""
    
    admin_token = None
    
    @pytest.fixture(scope="class", autouse=True)
    def setup_admin_token(self):
        """Get existing admin token"""
        import subprocess
        
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', '''
            use('test_database');
            var admin = db.users.findOne({email: 'vgpuranik@gmail.com'});
            if (admin) {
                var session = db.user_sessions.findOne({user_id: admin.user_id, expires_at: {'$gt': new Date()}});
                if (session) {
                    print('TOKEN:' + session.session_token);
                } else {
                    var token = 'admin_crud_test_' + Date.now();
                    db.user_sessions.insertOne({
                        user_id: admin.user_id,
                        session_token: token,
                        expires_at: new Date(Date.now() + 60*60*1000),
                        created_at: new Date()
                    });
                    print('TOKEN:' + token);
                }
            }
            '''
        ], capture_output=True, text=True)
        
        for line in result.stdout.split('\n'):
            if 'TOKEN:' in line:
                TestAdminBuildingsBasicCRUD.admin_token = line.split('TOKEN:')[1].strip()
                break

    def test_admin_list_buildings(self):
        """Test admin can list buildings"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/buildings",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin can list buildings - found {len(data)} buildings")

    def test_admin_create_building(self):
        """Test admin can create a building"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/buildings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "address": "TEST_Building_Discovery_Test",
                "city": "TestCity",
                "pincode": "123456",
                "building_type": "commercial",
                "total_footprint_area": 5000,
                "lat": 28.5,
                "lng": 77.2
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "building_id" in data
        assert data["address"] == "TEST_Building_Discovery_Test"
        print(f"PASS: Admin can create building - building_id: {data['building_id']}")
        
        # Clean up
        requests.delete(
            f"{BASE_URL}/api/admin/buildings/{data['building_id']}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_auth_me_without_token_returns_401(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("PASS: /api/auth/me without token returns 401")

    def test_auth_me_with_invalid_token_returns_401(self):
        """Test /api/auth/me with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_123"}
        )
        assert response.status_code == 401
        print("PASS: /api/auth/me with invalid token returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
