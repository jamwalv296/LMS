# Learning Management System (LMS)

# Abhyaas



A full-stack Learning Management System built with *Node.js, *Express.js, **EJS, and **MySQL/PostgreSQL.  

This LMS allows instructors to create and manage courses, upload materials, and organize quizzes — while students can enroll, access content, and track their learning progress.



---



- Features:



# Teacher Features

- Teacher registration and login.

- Create and manage courses.

- Upload learning materials (PDF, PPT, videos, etc.).

- Create and manage quizzes.

- View student scores and leaderboard.



# Student Features

- Student registration and secure login.

- Browse and enroll in courses.

- Access uploaded learning materials.

- Attempt quizzes and view results view the leaderboard





#  General System Features

- Authentication using bcryptjs for password hashing.

- Session management with express-session.

- Secure file uploads using multer.

- Role-based routing (Student / Instructor).

- Dynamic UI with EJS templates.

- Responsive and clean design.

- Supports both MySQL and PostgreSQL databases.



---

#Integrated AI Feature: Ask AI 



# Tech Stack



| Layer | Technology |

|--------|-------------|

| Frontend | EJS, HTML, CSS |

| Backend | Node.js, Express.js |

| Database |  PostgreSQL |

| Authentication | bcryptjs, express-session |

| File Handling | multer |

| Environment Management | dotenv |

| Deployment | Localhost 5000 |

| Ask Ai | OpenAi API |


---



# Project Structure

LMS/
├── public/ # Static assets (CSS, JS, images)
├── views/ # EJS templates for pages
├── uploads/ # Uploaded files (course materials)
├── routes/ # Express route handlers
├── server.js # Main entry point
├── package.json # Node dependencies
├── .env # Environment variables (create this)
└── LMS.sql # Database schema

---

#  Setup and Installation (Local Machine)

 Clone the Repository

using cmd or bash

git clone https://github.com/jamwalv296/LMS.git
cd LMS

Once the server runs 
It can be accessed on   localhost:5000

---x---
