CREATE DATABASE IF NOT EXISTS research_portal;
USE research_portal;
CREATE TABLE IF NOT EXISTS opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  research_area VARCHAR(100) NOT NULL,
  faculty_name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  required_skills VARCHAR(500) NOT NULL,
  positions INT NOT NULL CHECK (positions >= 1),
  deadline DATE NOT NULL,
  status ENUM('Open','Closed') NOT NULL DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO opportunities (title, description, research_area, faculty_name, department, required_skills, positions, deadline, status) VALUES
('ML-based Network Intrusion Detection','Build and evaluate machine learning models that detect attacks in network traffic using public datasets.','Cybersecurity','Dr. Ayesha Khan','Computer Science','Python, scikit-learn, Networking',2,'2026-12-15','Open'),
('Low-Resource Urdu Text Classification','Create a labelled Urdu dataset and train a text classifier.','Natural Language Processing','Dr. Imran Shah','Computer Science','Python, NLP basics',3,'2026-11-30','Open');
