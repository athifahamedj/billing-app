import os
import unittest
import uuid

os.environ.setdefault("AUTH_SECRET_KEY", "integration-test-secret-" + "x" * 40)

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import engine, get_db
from app.main import app
from app.models import (
    Customer,
    InventoryMovement,
    Product,
    Shop,
    Supplier,
    User,
)
from pwdlib import PasswordHash


class ShopAuthenticationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.password = "test-password-for-integration"
        cls.password_hash = PasswordHash.recommended().hash(cls.password)

    def setUp(self) -> None:
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.session = Session(bind=self.connection)
        self.manar = self.session.scalar(
            select(Shop).where(Shop.slug == "manar-motors")
        )
        self.assertIsNotNone(self.manar)

        suffix = uuid.uuid4().hex[:12]
        self.second_shop = Shop(
            name="Integration Test Shop",
            slug=f"integration-{suffix}",
        )
        self.session.add(self.second_shop)
        self.session.flush()

        self.manar_product = Product(
            shop_id=self.manar.shop_id,
            name="Manar test product",
            part_number=f"M-{suffix}",
            unit="Nos",
            mrp=10,
            purchase_price=8,
            selling_price=10,
            gst_rate=18,
        )
        self.second_product = Product(
            shop_id=self.second_shop.shop_id,
            name="Second shop test product",
            part_number=f"S-{suffix}",
            unit="Nos",
            mrp=20,
            purchase_price=15,
            selling_price=20,
        )
        self.second_shop_customer = Customer(
            shop_id=self.second_shop.shop_id,
            name="Second shop test customer",
            phone="1234567890",
        )
        self.second_shop_supplier = Supplier(
            shop_id=self.second_shop.shop_id,
            name="Second shop test supplier",
            phone="0987654321",
        )
        self.manar_supplier = Supplier(
            shop_id=self.manar.shop_id,
            name="Manar test supplier",
            phone="1112223333",
        )
        self.manar_user = User(
            username=f"manar-{suffix}",
            password_hash=self.password_hash,
            display_name="Manar Test User",
            role="shop_user",
            shop_id=self.manar.shop_id,
        )
        self.second_user = User(
            username=f"second-{suffix}",
            password_hash=self.password_hash,
            display_name="Second Test User",
            role="shop_user",
            shop_id=self.second_shop.shop_id,
        )
        self.admin_user = User(
            username=f"admin-{suffix}",
            password_hash=self.password_hash,
            display_name="Integration Test Admin",
            role="super_admin",
            shop_id=None,
        )
        self.session.add_all(
            [
                self.manar_product,
                self.second_product,
                self.second_shop_customer,
                self.second_shop_supplier,
                self.manar_supplier,
                self.manar_user,
                self.second_user,
                self.admin_user,
            ]
        )
        self.session.flush()
        self.manar_shop_id = str(self.manar.shop_id)
        self.second_shop_id = str(self.second_shop.shop_id)
        self.session.close()

        def override_get_db():
            request_session = Session(
                bind=self.connection,
                join_transaction_mode="create_savepoint",
            )
            try:
                yield request_session
            finally:
                request_session.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self.csrf_headers = {
            "Origin": "http://testserver",
            "X-CSRF-Protection": "1",
        }
        self.users = {
            "manar": f"manar-{suffix}",
            "second": f"second-{suffix}",
            "admin": f"admin-{suffix}",
        }

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()
        self.transaction.rollback()
        self.connection.close()

    def login(self, username: str):
        return self.client.post(
            "/api/auth/login",
            json={"username": username, "password": self.password},
            headers=self.csrf_headers,
        )

    def test_shop_users_only_receive_their_shop_products(self) -> None:
        manar_login = self.login(self.users["manar"])
        self.assertEqual(manar_login.status_code, 200)
        self.assertIn("httponly", manar_login.headers["set-cookie"].lower())

        manar_products = self.client.get(
            "/api/products",
            params={
                "q": self.users["manar"].removeprefix("manar-"),
            },
            headers={"X-Shop-ID": self.second_shop_id},
        )
        self.assertEqual(manar_products.status_code, 200)
        self.assertEqual(
            [item["name"] for item in manar_products.json()],
            ["Manar test product"],
        )
        self.assertEqual(
            manar_products.json()[0]["shop_id"],
            self.manar_shop_id,
        )

        self.client.post("/api/auth/logout", headers=self.csrf_headers)
        second_login = self.login(self.users["second"])
        self.assertEqual(second_login.status_code, 200)
        second_products = self.client.get(
            "/api/products",
            params={
                "q": self.users["second"].removeprefix("second-"),
            },
        )
        self.assertEqual(second_products.status_code, 200)
        self.assertEqual(
            [item["name"] for item in second_products.json()],
            ["Second shop test product"],
        )

    def test_super_admin_selects_each_shop_explicitly(self) -> None:
        login = self.login(self.users["admin"])
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.json()["role"], "super_admin")
        self.assertIsNone(login.json()["shop_id"])

        accessible_shops = self.client.get("/api/auth/shops")
        self.assertEqual(accessible_shops.status_code, 200)
        self.assertGreaterEqual(len(accessible_shops.json()), 2)

        without_selection = self.client.get("/api/products")
        self.assertEqual(without_selection.status_code, 400)

        manar_products = self.client.get(
            "/api/products",
            params={"q": self.users["manar"].removeprefix("manar-")},
            headers={"X-Shop-ID": self.manar_shop_id},
        )
        second_products = self.client.get(
            "/api/products",
            params={"q": self.users["admin"].removeprefix("admin-")},
            headers={"X-Shop-ID": self.second_shop_id},
        )
        self.assertEqual(
            [item["name"] for item in manar_products.json()],
            ["Manar test product"],
        )
        self.assertEqual(
            [item["name"] for item in second_products.json()],
            ["Second shop test product"],
        )

    def test_authentication_is_required_and_logout_clears_cookie(self) -> None:
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

        login = self.login(self.users["manar"])
        self.assertEqual(login.status_code, 200)
        identity = self.client.get("/api/auth/me")
        self.assertEqual(identity.status_code, 200)
        self.assertEqual(identity.json()["shop_id"], self.manar_shop_id)

        logout = self.client.post(
            "/api/auth/logout",
            headers=self.csrf_headers,
        )
        self.assertEqual(logout.status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_invalid_password_is_rejected(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"username": self.users["manar"], "password": "wrong"},
            headers=self.csrf_headers,
        )
        self.assertEqual(response.status_code, 401)

    def test_public_registration_endpoints_are_removed(self) -> None:
        self.assertEqual(
            self.client.get("/api/auth/registration-shops").status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                "/api/auth/register",
                json={},
                headers=self.csrf_headers,
            ).status_code,
            404,
        )

    def test_product_writes_require_same_origin_csrf_headers(self) -> None:
        self.login(self.users["manar"])
        payload = {
            "name": "CSRF check product",
            "part_number": f"CSRF-{uuid.uuid4().hex[:8]}",
            "unit": "Nos",
            "mrp": 10,
            "purchase_price": 8,
            "selling_price": 9,
        }
        no_csrf = self.client.post(
            "/api/products",
            json=payload,
        )
        self.assertEqual(no_csrf.status_code, 403)

        foreign_origin = self.client.post(
            "/api/products",
            json=payload,
            headers={
                **self.csrf_headers,
                "Origin": "https://attacker.example",
            },
        )
        self.assertEqual(foreign_origin.status_code, 403)

    def test_product_writes_allow_configured_frontend_proxy_origin(self) -> None:
        self.login(self.users["manar"])
        previous_origins = os.environ.get("CSRF_TRUSTED_ORIGINS")
        os.environ["CSRF_TRUSTED_ORIGINS"] = (
            "http://localhost:5173,http://127.0.0.1:5173"
        )
        try:
            response = self.client.post(
                "/api/products",
                json={
                    "name": "Proxy origin product",
                    "part_number": f"PROXY-{uuid.uuid4().hex[:8]}",
                    "unit": "Nos",
                    "mrp": 10,
                    "purchase_price": 8,
                    "selling_price": 9,
                },
                headers={
                    **self.csrf_headers,
                    "Origin": "http://localhost:5173",
                },
            )
            self.assertEqual(response.status_code, 201)
        finally:
            if previous_origins is None:
                os.environ.pop("CSRF_TRUSTED_ORIGINS", None)
            else:
                os.environ["CSRF_TRUSTED_ORIGINS"] = previous_origins

    def test_seeded_products_are_available_through_scoped_api(self) -> None:
        self.login(self.users["manar"])
        response = self.client.get(
            "/api/products",
            params={"q": "1000", "include_inactive": "true"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [product["name"] for product in response.json()],
            ["A1"],
        )

    def test_product_crud_validates_and_scopes_by_shop(self) -> None:
        self.login(self.users["manar"])
        payload = {
            "name": " Brake Pad ",
            "part_number": f" BP-{uuid.uuid4().hex[:8]} ",
            "unit": "Nos",
            "mrp": "100.00",
            "purchase_price": "65.00",
            "selling_price": "90.00",
            "category": " ",
            "company": "Acme",
            "gst_rate": "18",
            "short_name": None,
        }
        created = self.client.post(
            "/api/products",
            json=payload,
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201)
        created_product = created.json()
        self.assertEqual(created_product["shop_id"], self.manar_shop_id)
        self.assertEqual(created_product["name"], "Brake Pad")
        self.assertIsNone(created_product["category"])

        duplicate = self.client.post(
            "/api/products",
            json={**payload, "name": "Another Name"},
            headers=self.csrf_headers,
        )
        self.assertEqual(duplicate.status_code, 409)

        invalid = self.client.post(
            "/api/products",
            json={**payload, "part_number": "INVALID", "mrp": -1},
            headers=self.csrf_headers,
        )
        self.assertEqual(invalid.status_code, 422)

        search = self.client.get("/api/products?q=brake")
        self.assertEqual(search.status_code, 200)
        self.assertEqual([item["product_id"] for item in search.json()], [created_product["product_id"]])

        other_shop_update = self.client.put(
            f"/api/products/{self.second_product.product_id}",
            json=payload,
            headers=self.csrf_headers,
        )
        self.assertEqual(other_shop_update.status_code, 404)

        updated = self.client.put(
            f"/api/products/{created_product['product_id']}",
            json={**payload, "name": "Updated Brake Pad"},
            headers=self.csrf_headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["name"], "Updated Brake Pad")

        deactivated = self.client.delete(
            f"/api/products/{created_product['product_id']}",
            headers=self.csrf_headers,
        )
        self.assertEqual(deactivated.status_code, 204)
        active_products = self.client.get(
            "/api/products",
            params={"q": created_product["part_number"]},
        )
        self.assertEqual(
            [item["name"] for item in active_products.json()],
            [],
        )
        all_products = self.client.get(
            "/api/products",
            params={
                "q": created_product["part_number"],
                "include_inactive": "true",
            },
        )
        self.assertIn(
            created_product["product_id"],
            [item["product_id"] for item in all_products.json()],
        )

    def test_super_admin_product_write_uses_selected_shop(self) -> None:
        self.login(self.users["admin"])
        second_shop_headers = {
            **self.csrf_headers,
            "X-Shop-ID": self.second_shop_id,
        }
        response = self.client.post(
            "/api/products",
            json={
                "name": "Second shop created product",
                "part_number": f"ADMIN-{uuid.uuid4().hex[:8]}",
                "unit": "Nos",
                "mrp": 20,
                "purchase_price": 15,
                "selling_price": 18,
            },
            headers=second_shop_headers,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["shop_id"], self.second_shop_id)

        manar_products = self.client.get(
            "/api/products",
            params={"q": response.json()["part_number"]},
            headers={"X-Shop-ID": self.manar_shop_id},
        )
        self.assertNotIn(
            "Second shop created product",
            [item["name"] for item in manar_products.json()],
        )

        second_shop_products = self.client.get(
            "/api/products",
            headers={"X-Shop-ID": self.second_shop_id},
        )
        self.assertIn(
            "Second shop created product",
            [item["name"] for item in second_shop_products.json()],
        )

    def test_customer_crud_validation_and_shop_isolation(self) -> None:
        self.login(self.users["manar"])
        payload = {
            "name": "  Local Customer  ",
            "customer_type": "Retail",
            "phone": "1234567890",
            "email": "customer@example.com",
            "address": "1 Main Street",
            "gstin": None,
        }
        created = self.client.post(
            "/api/customers",
            json=payload,
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201)
        customer = created.json()
        self.assertEqual(customer["name"], "Local Customer")
        self.assertEqual(customer["shop_id"], self.manar_shop_id)

        invalid_email = self.client.post(
            "/api/customers",
            json={**payload, "email": "not-an-email"},
            headers=self.csrf_headers,
        )
        self.assertEqual(invalid_email.status_code, 422)

        search = self.client.get("/api/customers?q=Local")
        self.assertEqual(
            [record["customer_id"] for record in search.json()],
            [customer["customer_id"]],
        )
        cross_shop = self.client.put(
            f"/api/customers/{self.second_shop_customer.customer_id}",
            json=payload,
            headers=self.csrf_headers,
        )
        self.assertEqual(cross_shop.status_code, 404)

        updated = self.client.put(
            f"/api/customers/{customer['customer_id']}",
            json={**payload, "name": "Updated Local Customer"},
            headers=self.csrf_headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["name"], "Updated Local Customer")

        deactivated = self.client.delete(
            f"/api/customers/{customer['customer_id']}",
            headers=self.csrf_headers,
        )
        self.assertEqual(deactivated.status_code, 204)
        self.assertEqual(
            self.client.get(
                "/api/customers",
                params={"q": "Updated Local Customer"},
            ).json(),
            [],
        )
        inactive = self.client.get(
            "/api/customers",
            params={
                "q": "Updated Local Customer",
                "include_inactive": "true",
            },
        )
        self.assertFalse(inactive.json()[0]["is_active"])

    def test_supplier_crud_validation_and_shop_isolation(self) -> None:
        self.login(self.users["manar"])
        payload = {
            "name": "Local Supplier",
            "supplier_type": "Parts",
            "phone": "1234567890",
            "email": "supplier@example.com",
            "address": "2 Main Street",
            "gstin": "27ABCDE1234F1Z5",
            "payment_terms": "Net 30",
        }
        created = self.client.post(
            "/api/suppliers",
            json=payload,
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201)
        supplier = created.json()
        self.assertEqual(supplier["shop_id"], self.manar_shop_id)
        self.assertEqual(supplier["gstin"], payload["gstin"])

        invalid_email = self.client.post(
            "/api/suppliers",
            json={**payload, "email": "not-an-email"},
            headers=self.csrf_headers,
        )
        self.assertEqual(invalid_email.status_code, 422)

        search = self.client.get("/api/suppliers?q=Local")
        self.assertEqual(
            [record["supplier_id"] for record in search.json()],
            [supplier["supplier_id"]],
        )
        cross_shop = self.client.put(
            f"/api/suppliers/{self.second_shop_supplier.supplier_id}",
            json=payload,
            headers=self.csrf_headers,
        )
        self.assertEqual(cross_shop.status_code, 404)

        updated = self.client.put(
            f"/api/suppliers/{supplier['supplier_id']}",
            json={**payload, "name": "Updated Local Supplier"},
            headers=self.csrf_headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["name"], "Updated Local Supplier")

        deactivated = self.client.delete(
            f"/api/suppliers/{supplier['supplier_id']}",
            headers=self.csrf_headers,
        )
        self.assertEqual(deactivated.status_code, 204)
        active = self.client.get(
            "/api/suppliers",
            params={"q": "Updated Local Supplier"},
        )
        self.assertEqual(active.json(), [])
        inactive = self.client.get(
            "/api/suppliers",
            params={
                "q": "Updated Local Supplier",
                "include_inactive": "true",
            },
        )
        self.assertFalse(inactive.json()[0]["is_active"])

    def test_customer_and_supplier_lists_are_tenant_scoped(self) -> None:
        self.login(self.users["manar"])
        for endpoint, other_name in [
            ("/api/customers", "Second shop test customer"),
            ("/api/suppliers", "Second shop test supplier"),
        ]:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200)
            self.assertNotIn(
                other_name,
                [record["name"] for record in response.json()],
            )

    def _purchase_payload(self, quantity: int = 4) -> dict:
        return {
            "supplier_id": str(self.manar_supplier.supplier_id),
            "invoice_number": f"PUR-{uuid.uuid4().hex[:8]}",
            "purchase_date": "2026-09-27",
            "items": [
                {
                    "product_id": str(self.manar_product.product_id),
                    "quantity": quantity,
                    "unit_price": "8.00",
                    "discount_amount": "2.00",
                    "gst_rate": "18",
                }
            ],
        }

    def _receive_manar_stock(self, quantity: int = 8) -> None:
        purchase = self.client.post(
            "/api/purchases",
            json=self._purchase_payload(quantity),
            headers=self.csrf_headers,
        )
        self.assertEqual(purchase.status_code, 201, purchase.text)
        received = self.client.post(
            f"/api/purchases/{purchase.json()['purchase_id']}/receive",
            headers=self.csrf_headers,
        )
        self.assertEqual(received.status_code, 200, received.text)

    def _sale_payload(
        self,
        quantity: int = 2,
        payments: list[dict] | None = None,
    ) -> dict:
        return {
            "customer_id": None,
            "items": [
                {
                    "product_id": str(self.manar_product.product_id),
                    "quantity": quantity,
                }
            ],
            "payments": payments or [],
        }

    def test_purchase_draft_receive_and_void_reverse_stock(self) -> None:
        self.login(self.users["manar"])
        created = self.client.post(
            "/api/purchases",
            json=self._purchase_payload(),
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201, created.text)
        draft = created.json()
        self.assertEqual(draft["status"], "draft")
        self.assertEqual(draft["subtotal"], "32.00")
        self.assertEqual(draft["discount_amount"], "2.00")
        self.assertEqual(draft["taxable_amount"], "30.00")
        self.assertEqual(draft["gst_amount"], "5.40")
        self.assertEqual(draft["total_amount"], "35.40")

        inventory_before_receive = self.client.get(
            "/api/inventory",
            params={"q": self.manar_product.part_number},
        )
        self.assertEqual(
            inventory_before_receive.json()[0]["quantity_on_hand"],
            0,
        )

        received = self.client.post(
            f"/api/purchases/{draft['purchase_id']}/receive",
            headers=self.csrf_headers,
        )
        self.assertEqual(received.status_code, 200, received.text)
        self.assertEqual(received.json()["status"], "received")
        received_again = self.client.post(
            f"/api/purchases/{draft['purchase_id']}/receive",
            headers=self.csrf_headers,
        )
        self.assertEqual(received_again.status_code, 409)

        inventory_after_receive = self.client.get(
            "/api/inventory",
            params={"q": self.manar_product.part_number},
        )
        self.assertEqual(
            inventory_after_receive.json()[0]["quantity_on_hand"],
            4,
        )

        voided = self.client.post(
            f"/api/purchases/{draft['purchase_id']}/void",
            headers=self.csrf_headers,
        )
        self.assertEqual(voided.status_code, 200, voided.text)
        self.assertEqual(voided.json()["status"], "void")
        inventory_after_void = self.client.get(
            "/api/inventory",
            params={"q": self.manar_product.part_number},
        )
        self.assertEqual(
            inventory_after_void.json()[0]["quantity_on_hand"],
            0,
        )

    def test_purchase_blocks_void_when_received_stock_was_used(self) -> None:
        self.login(self.users["manar"])
        created = self.client.post(
            "/api/purchases",
            json=self._purchase_payload(quantity=4),
            headers=self.csrf_headers,
        )
        purchase_id = created.json()["purchase_id"]
        received = self.client.post(
            f"/api/purchases/{purchase_id}/receive",
            headers=self.csrf_headers,
        )
        self.assertEqual(received.status_code, 200)

        adjustment = InventoryMovement(
            shop_id=self.manar.shop_id,
            product_id=self.manar_product.product_id,
            movement_type="adjustment",
            quantity_delta=-1,
            note="Test consumed stock",
        )
        self.session.add(adjustment)
        self.session.flush()
        blocked_void = self.client.post(
            f"/api/purchases/{purchase_id}/void",
            headers=self.csrf_headers,
        )
        self.assertEqual(blocked_void.status_code, 409)
        self.assertIn("already been used", blocked_void.json()["detail"])
        purchase = self.client.get("/api/purchases")
        self.assertEqual(purchase.json()[0]["status"], "received")

    def test_purchase_api_rejects_cross_shop_refs_and_bad_lines(self) -> None:
        self.login(self.users["manar"])
        payload = self._purchase_payload()
        cross_shop_supplier = {
            **payload,
            "supplier_id": str(self.second_shop_supplier.supplier_id),
        }
        supplier_response = self.client.post(
            "/api/purchases",
            json=cross_shop_supplier,
            headers=self.csrf_headers,
        )
        self.assertEqual(supplier_response.status_code, 404)

        cross_shop_product = self.client.post(
            "/api/purchases",
            json={
                **payload,
                "items": [
                    {
                        **payload["items"][0],
                        "product_id": str(self.second_product.product_id),
                    }
                ],
            },
            headers=self.csrf_headers,
        )
        self.assertEqual(cross_shop_product.status_code, 400)

        duplicate_product = self.client.post(
            "/api/purchases",
            json={
                **payload,
                "items": [payload["items"][0], payload["items"][0]],
            },
            headers=self.csrf_headers,
        )
        self.assertEqual(duplicate_product.status_code, 422)

        no_csrf = self.client.post(
            "/api/purchases",
            json=payload,
        )
        self.assertEqual(no_csrf.status_code, 403)

    def test_purchase_list_and_inventory_are_shop_scoped(self) -> None:
        self.login(self.users["manar"])
        created = self.client.post(
            "/api/purchases",
            json=self._purchase_payload(),
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201)
        self.client.post("/api/auth/logout", headers=self.csrf_headers)
        self.login(self.users["admin"])
        other_shop_purchases = self.client.get(
            "/api/purchases",
            headers={"X-Shop-ID": self.second_shop_id},
        )
        self.assertEqual(other_shop_purchases.json(), [])
        other_shop_inventory = self.client.get(
            "/api/inventory",
            headers={"X-Shop-ID": self.second_shop_id},
        )
        self.assertNotIn(
            self.manar_product.product_id,
            [item["product_id"] for item in other_shop_inventory.json()],
        )

    def test_super_admin_purchase_receipt_uses_selected_shop(self) -> None:
        self.login(self.users["admin"])
        response = self.client.post(
            "/api/purchases",
            headers={
                **self.csrf_headers,
                "X-Shop-ID": self.second_shop_id,
            },
            json={
                "supplier_id": str(self.second_shop_supplier.supplier_id),
                "invoice_number": f"ADMIN-{uuid.uuid4().hex[:8]}",
                "purchase_date": "2026-09-27",
                "items": [
                    {
                        "product_id": str(self.second_product.product_id),
                        "quantity": 7,
                        "unit_price": 15,
                        "gst_rate": 18,
                    }
                ],
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        purchase = response.json()
        self.assertEqual(purchase["shop_id"], self.second_shop_id)

        received = self.client.post(
            f"/api/purchases/{purchase['purchase_id']}/receive",
            headers={"X-Shop-ID": self.second_shop_id, **self.csrf_headers},
        )
        self.assertEqual(received.status_code, 200, received.text)

        second_shop_stock = self.client.get(
            "/api/inventory",
            params={"q": self.second_product.part_number},
            headers={"X-Shop-ID": self.second_shop_id},
        )
        self.assertEqual(
            second_shop_stock.json()[0]["quantity_on_hand"],
            7,
        )
        manar_stock = self.client.get(
            "/api/inventory",
            params={"q": self.second_product.part_number},
            headers={"X-Shop-ID": self.manar_shop_id},
        )
        self.assertEqual(manar_stock.json(), [])

    def test_sales_deduct_stock_and_derive_partial_paid_and_unpaid_balances(
        self,
    ) -> None:
        self.login(self.users["manar"])
        self._receive_manar_stock(quantity=8)

        created = self.client.post(
            "/api/sales",
            json=self._sale_payload(
                quantity=2,
                payments=[
                    {
                        "amount": "4.00",
                        "payment_method": "cash",
                        "payment_date": "2026-09-27",
                    },
                    {
                        "amount": "3.00",
                        "payment_method": "upi",
                        "payment_date": "2026-09-27",
                        "reference": "UPI-123",
                    },
                ],
            ),
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201, created.text)
        sale = created.json()
        self.assertEqual(sale["status"], "completed")
        self.assertEqual(sale["subtotal"], "20.00")
        self.assertEqual(sale["gst_amount"], "3.60")
        self.assertEqual(sale["total_amount"], "23.60")
        self.assertEqual(sale["paid_amount"], "7.00")
        self.assertEqual(sale["outstanding_amount"], "16.60")
        self.assertEqual(sale["payment_status"], "partially_paid")
        self.assertEqual(
            [payment["payment_method"] for payment in sale["payments"]],
            ["cash", "upi"],
        )
        self.assertEqual(
            self.client.get(
                "/api/inventory",
                params={"q": self.manar_product.part_number},
            ).json()[0]["quantity_on_hand"],
            6,
        )

        overpayment = self.client.post(
            f"/api/sales/{sale['sale_id']}/payments",
            json={
                "payments": [
                    {
                        "amount": "16.61",
                        "payment_method": "card",
                    }
                ]
            },
            headers=self.csrf_headers,
        )
        self.assertEqual(overpayment.status_code, 422)

        completed = self.client.post(
            f"/api/sales/{sale['sale_id']}/payments",
            json={
                "payments": [
                    {
                        "amount": "10.00",
                        "payment_method": "card",
                    },
                    {
                        "amount": "6.60",
                        "payment_method": "bank_transfer",
                    },
                ]
            },
            headers=self.csrf_headers,
        )
        self.assertEqual(completed.status_code, 200, completed.text)
        self.assertEqual(completed.json()["payment_status"], "paid")
        self.assertEqual(completed.json()["outstanding_amount"], "0.00")

        unpaid = self.client.post(
            "/api/sales",
            json=self._sale_payload(quantity=1),
            headers=self.csrf_headers,
        )
        self.assertEqual(unpaid.status_code, 201, unpaid.text)
        self.assertEqual(unpaid.json()["paid_amount"], "0.00")
        self.assertEqual(unpaid.json()["payment_status"], "unpaid")
        self.assertEqual(unpaid.json()["outstanding_amount"], "11.80")

    def test_sale_payment_reversal_must_precede_sale_void_and_restores_stock(
        self,
    ) -> None:
        self.login(self.users["manar"])
        self._receive_manar_stock(quantity=5)

        created = self.client.post(
            "/api/sales",
            json=self._sale_payload(
                quantity=3,
                payments=[
                    {
                        "amount": "7.50",
                        "payment_method": "cash",
                    }
                ],
            ),
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201, created.text)
        sale = created.json()
        direct_void = self.client.post(
            f"/api/sales/{sale['sale_id']}/void",
            headers=self.csrf_headers,
        )
        self.assertEqual(direct_void.status_code, 409)
        self.assertEqual(
            direct_void.json()["detail"],
            "Void or reverse the recorded payment first.",
        )

        payment_id = sale["payments"][0]["payment_id"]
        missing_reason = self.client.post(
            f"/api/payments/{payment_id}/void",
            json={"reason": " "},
            headers=self.csrf_headers,
        )
        self.assertEqual(missing_reason.status_code, 422)
        reversed_payment = self.client.post(
            f"/api/payments/{payment_id}/void",
            json={"reason": "Incorrect tender"},
            headers=self.csrf_headers,
        )
        self.assertEqual(reversed_payment.status_code, 200)
        self.assertEqual(reversed_payment.json()["payment_status"], "unpaid")
        self.assertEqual(reversed_payment.json()["payments"][0]["status"], "void")
        self.assertEqual(reversed_payment.json()["paid_amount"], "0.00")

        voided = self.client.post(
            f"/api/sales/{sale['sale_id']}/void",
            headers=self.csrf_headers,
        )
        self.assertEqual(voided.status_code, 200, voided.text)
        self.assertEqual(voided.json()["status"], "void")
        self.assertEqual(voided.json()["payment_status"], "void")
        self.assertEqual(
            self.client.get(
                "/api/inventory",
                params={"q": self.manar_product.part_number},
            ).json()[0]["quantity_on_hand"],
            5,
        )

        duplicate_sale_void = self.client.post(
            f"/api/sales/{sale['sale_id']}/void",
            headers=self.csrf_headers,
        )
        self.assertEqual(duplicate_sale_void.status_code, 409)
        duplicate_payment_void = self.client.post(
            f"/api/payments/{payment_id}/void",
            json={"reason": "Repeat"},
            headers=self.csrf_headers,
        )
        self.assertEqual(duplicate_payment_void.status_code, 409)

    def test_sales_validate_stock_refs_payments_csrf_and_shop_scope(self) -> None:
        self.login(self.users["manar"])
        self._receive_manar_stock(quantity=2)
        payload = self._sale_payload(quantity=1)

        no_csrf = self.client.post("/api/sales", json=payload)
        self.assertEqual(no_csrf.status_code, 403)

        no_stock = self.client.post(
            "/api/sales",
            json=self._sale_payload(quantity=3),
            headers=self.csrf_headers,
        )
        self.assertEqual(no_stock.status_code, 409)
        self.assertIn("Insufficient stock", no_stock.json()["detail"])

        cross_shop_product = self.client.post(
            "/api/sales",
            json={
                "items": [
                    {
                        "product_id": str(self.second_product.product_id),
                        "quantity": 1,
                    }
                ]
            },
            headers=self.csrf_headers,
        )
        self.assertEqual(cross_shop_product.status_code, 400)

        cross_shop_customer = self.client.post(
            "/api/sales",
            json={
                **payload,
                "customer_id": str(self.second_shop_customer.customer_id),
            },
            headers=self.csrf_headers,
        )
        self.assertEqual(cross_shop_customer.status_code, 404)

        invalid_method = self.client.post(
            "/api/sales",
            json=self._sale_payload(
                payments=[
                    {
                        "amount": "1.00",
                        "payment_method": "credit",
                    }
                ]
            ),
            headers=self.csrf_headers,
        )
        self.assertEqual(invalid_method.status_code, 422)

        overspend = self.client.post(
            "/api/sales",
            json=self._sale_payload(
                quantity=1,
                payments=[
                    {
                        "amount": "11.81",
                        "payment_method": "cash",
                    }
                ]
            ),
            headers=self.csrf_headers,
        )
        self.assertEqual(overspend.status_code, 422, overspend.text)

        created = self.client.post(
            "/api/sales",
            json=payload,
            headers=self.csrf_headers,
        )
        self.assertEqual(created.status_code, 201, created.text)
        sale_id = created.json()["sale_id"]
        self.client.post("/api/auth/logout", headers=self.csrf_headers)
        self.login(self.users["second"])
        self.assertEqual(self.client.get("/api/sales").json(), [])
        foreign_void = self.client.post(
            f"/api/sales/{sale_id}/void",
            headers=self.csrf_headers,
        )
        self.assertEqual(foreign_void.status_code, 404)

    def test_super_admin_sale_writes_require_and_use_selected_shop(self) -> None:
        self.login(self.users["admin"])
        missing_shop = self.client.get("/api/sales")
        self.assertEqual(missing_shop.status_code, 400)

        second_shop_headers = {
            **self.csrf_headers,
            "X-Shop-ID": self.second_shop_id,
        }
        purchase_payload = {
            "supplier_id": str(self.second_shop_supplier.supplier_id),
            "invoice_number": f"ADMIN-SALE-{uuid.uuid4().hex[:8]}",
            "purchase_date": "2026-09-27",
            "items": [
                {
                    "product_id": str(self.second_product.product_id),
                    "quantity": 3,
                    "unit_price": "15.00",
                }
            ],
        }
        purchase = self.client.post(
            "/api/purchases",
            json=purchase_payload,
            headers=second_shop_headers,
        )
        self.assertEqual(purchase.status_code, 201, purchase.text)
        received = self.client.post(
            f"/api/purchases/{purchase.json()['purchase_id']}/receive",
            headers=second_shop_headers,
        )
        self.assertEqual(received.status_code, 200, received.text)

        sale = self.client.post(
            "/api/sales",
            json={
                "items": [
                    {
                        "product_id": str(self.second_product.product_id),
                        "quantity": 1,
                    }
                ]
            },
            headers=second_shop_headers,
        )
        self.assertEqual(sale.status_code, 201, sale.text)
        self.assertEqual(sale.json()["shop_id"], self.second_shop_id)

        manar_sales = self.client.get(
            "/api/sales",
            headers={"X-Shop-ID": self.manar_shop_id},
        )
        second_shop_sales = self.client.get(
            "/api/sales",
            headers={"X-Shop-ID": self.second_shop_id},
        )
        self.assertEqual(manar_sales.json(), [])
        self.assertEqual(
            [record["sale_id"] for record in second_shop_sales.json()],
            [sale.json()["sale_id"]],
        )


if __name__ == "__main__":
    unittest.main()
