import tempfile
import unittest
from pathlib import Path

import app


class IncluLearnAITest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        app.DB_PATH = Path(self.temp.name) / "test.db"
        app.DB_DIR = Path(self.temp.name)
        app.init_db()
        self.client = app.app.test_client()

    def tearDown(self):
        self.temp.cleanup()

    def test_create_material_and_progress(self):
        response = self.client.post(
            "/api/materials",
            data={
                "title": "Мұрагерлік",
                "text": "Мұрагерлік бір кластың қасиеттерін басқа класқа береді.",
            },
        )
        self.assertEqual(response.status_code, 201)
        material_id = response.get_json()["id"]
        progress = self.client.post(
            f"/api/materials/{material_id}/progress",
            json={"completed": True, "score": 100},
        )
        self.assertEqual(progress.status_code, 200)
        self.assertEqual(progress.get_json()["score"], 100)

    def test_search_and_delete_material(self):
        response = self.client.post(
            "/api/materials",
            data={"title": "ООП", "text": "Бала класс әдістерді қолданады."},
        )
        material_id = response.get_json()["id"]
        found = self.client.get("/api/materials?q=ООП")
        self.assertEqual(len(found.get_json()["materials"]), 1)
        deleted = self.client.delete(f"/api/materials/{material_id}")
        self.assertEqual(deleted.status_code, 200)


if __name__ == "__main__":
    unittest.main()