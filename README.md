# Hostel Meal Management System

A complete hostel meal management website ready to use built with Vite + React, Typescript, Tailwind CSS, and Firebase.

## Features

- **Authentication**: Email/Password login and registration.
- **Roles**: Admin and Student roles.
- **Admin Panel**:
  - Manage Meals (Add/Edit/Delete, Image Upload).
  - Manage Users (View list, Add Balance).
  - Reports (View Orders, Export CSV).
- **Student Panel**:
  - View Meals by Time Slot (Breakfast, Lunch, Dinner).
  - Add to Cart & Place Orders.
  - Balance Deduction System.
- **Security**: Firestore Rules to protect data.

## Prerequisites

- Node.js (v16+)
- Firebase Account

## Setup Instructions

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** (Email/Password provider).
4. Enable **Firestore Database** (Start in production mode).
5. Enable **Storage**.
6. Copy your Firebase config keys.

### 3. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`) and fill in your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Locally

```bash
npm run dev
```

### 5. First Time Setup (Seeding Data)

1. Register a new account.
2. Go to Firestore Console and manually change your user role to `admin` in the `users` collection.
3. Login as Admin.
4. Click "Seed Sample Data" on the dashboard to populate meals.

## Cloud Functions

The `functions/` directory contains Cloud Functions for:

- `promoteUserToAdmin`: Callable function to promote users.
- `dailyReport`: Scheduled daily sales report.

To deploy functions (requires Blaze plan):

```bash
cd functions
npm install
firebase deploy --only functions
```

## Security Rules

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```
