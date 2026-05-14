# 🧠 Real-Time Whiteboard (Microservices + WebSockets + Kafka)

A **real-time collaborative whiteboard system** built using a microservices architecture.  
This project is currently under active development and focuses on scalable real-time collaboration using WebSockets, API Gateway routing, and event-driven communication.

---

## 🚀 Features

- 🔐 Authentication service (user login/register)
- 📦 Board management service (create & manage boards)
- ⚡ Real-time action service (WebSockets for live collaboration)
- 🌐 API Gateway using NGINX
- 🧩 Microservices-based architecture
- 📡 Real-time communication (WebSockets + event-driven design)
- 🐳 Fully containerized using Docker

---

## 🏗️ Architecture Overview
<img width="672" height="708" alt="image" src="https://github.com/user-attachments/assets/4363fafa-6cc3-47f2-b9f1-2a6f0735e295" />
---

## 📂 Services

### 1. Auth Service
- User authentication
- JWT-based login system

### 2. Board Service
- Create and manage boards
- Access control for boards

### 3. Action Service
- WebSocket server
- Real-time collaboration (drawing/events)
- Handles live board updates

---

## 🏗️ Deployment Overview

### AWS deployment:


<img width="533" height="406" alt="image" src="https://github.com/user-attachments/assets/eccef47b-1869-407f-899c-08384c2c04d6" />

## 🐳 Running the Project

### 🔧 Prerequisites
- Docker
- Docker Compose

---

### ▶️ Start the system

```bash
docker-compose up --build
