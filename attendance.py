import json
import os
from datetime import datetime
import math

DATA_FILE = "attendance.json"

class AttendanceManager:
    def __init__(self):
        self.undone_stack = []
        self.semesters = {str(i): {} for i in range(1, 9)}
        self.load()

    def load(self):
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r") as f:
                try:
                    self.semesters = json.load(f)
                except json.JSONDecodeError:
                    print("Warning: attendance.json is empty or corrupted. Starting fresh.")
                    pass

    def save(self):
        with open(DATA_FILE, "w") as f:
            json.dump(self.semesters, f, indent=4)

    def add_subject(self, sem, subject):
        if sem in self.semesters and subject not in self.semesters[sem]:
            self.semesters[sem][subject] = {"attended": 0, "total": 0, "logs": []}
            self.save()

    def delete_subject(self, sem, subject):
        if sem in self.semesters and subject in self.semesters[sem]:
            del self.semesters[sem][subject]
            self.save()

    def mark_attendance(self, sem, subject, status):
        subj = self.semesters.get(sem, {}).get(subject)
        if subj is not None:
            subj["total"] += 1
            if status == "p":
                subj["attended"] += 1
            subj["logs"].append({
                "timestamp": datetime.now().isoformat(),
                "status": status
            })
            self.save()

    def undo_last_action_for_subject(self, sem, subject):
        """Reverses the last attendance mark for a specific subject."""
        if sem not in self.semesters or subject not in self.semesters[sem]:
            return False

        subj = self.semesters[sem][subject]
        if not subj["logs"]:
            return False # No actions to undo for this subject

        last_log = subj["logs"].pop()
        subj["total"] -= 1
        if last_log["status"] == "p":
            subj["attended"] -= 1
        
        self.undone_stack.append({
            "sem": sem,
            "subject": subject,
            "action": last_log
        })
        
        self.save()
        return True

    def redo_last_action(self):
        if not self.undone_stack:
            return None

        last_undone = self.undone_stack.pop()
        sem, subject, action = last_undone["sem"], last_undone["subject"], last_undone["action"]

        subj_data = self.semesters[sem][subject]
        subj_data["total"] += 1
        if action["status"] == "p":
            subj_data["attended"] += 1
        subj_data["logs"].append(action)
        self.save()
        
        return {"sem": sem, "subject": subject}

    def calc_percent(self, attended, total):
        return round((attended / total) * 100, 1) if total > 0 else 0

    def calculate_recovery_classes(self, attended, total, target_percent=75):
        current_percent = self.calc_percent(attended, total)
        if current_percent >= target_percent:
            return 0
        target_decimal = target_percent / 100.0
        numerator = (target_decimal * total) - attended
        denominator = 1 - target_decimal
        if denominator <= 0: return float('inf')
        required_classes = math.ceil(numerator / denominator)
        return int(required_classes)

    def overall_summary(self, sem):
        total_attended, total_classes = 0, 0
        if sem in self.semesters:
            for subj in self.semesters[sem].values():
                total_attended += subj["attended"]
                total_classes += subj["total"]
        percent = self.calc_percent(total_attended, total_classes)
        return {
            "attended": total_attended, "total": total_classes,
            "absent": total_classes - total_attended, "percent": percent
        }