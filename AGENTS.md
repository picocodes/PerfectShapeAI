# PerfectShape AI

This is a gamified AI-powered weight loss consumer app with mobile + web + backend architecture.

Project Overview

An AI-powered weight loss app that helps users lose weight at home without going to a gym. The marketing site will be built with WordPress at perfectshapeai.com, so don't worry about that part. The main focus is building the product itself with a React Native mobile app, a Next.js web dashboard, and a Node.js backend.

Users get 0.1 free credits upon account creation. They can use these credits to generate personalized workout plans, get AI coaching, and log meals. Once depleted, they can purchase more credits.

Paid plans cost $4.99/month for 100 credits.
This grants them 100 credits for the month. Each credit gives the user 10k input/output tokens for AI interactions. This will be calcuated and enforced server-side, be checking the request's token usage reported by Cloudflare AI Gateway.

If credit is depleted, the user can purchase more credits via in-app purchases on mobile or Freemius one-time purchase on web. This is a 1-time purchase and only updates the credit balance in the backend.

Do not display the credit balance on the client. The client should just display a message when they run out of credits and prompt them to purchase more. The backend will handle all credit tracking and enforcement.

## Core app concept
Goal: Help users lose weight without a gym using:

* AI-generated personalized Bodyweight workout plans
* Home-friendly personalized meal guidance (show foods available in their country)
* Gamification (XP, streaks, levels)
* AI coaching for motivation and accountability

### User onboarding
- Age, gender, height, weight
- Target weight
- Activity level (sedentary, light, moderate, active)
- Country (if not able to detect automatically)
- Dietary preferences (vegan, vegetarian, keto, budget, none)
- Available equipment (none, dumbbells, resistance bands, skipping rope)
- Daily availability for workouts (15 mins, 30 mins, 45 mins)

### AI-generated workout plans
- Weekly workout plans (home-based only)
- Daily calorie deficit target
- Simple meal suggestions based on local food availability
- Habit checklist.
- These don't consume credits as long as the users has an active subscription.
- If possible, we can automatically log steps (for both walking and running).

### Daily workflow
- User logs in and sees today's workout, calorie target, and streak.
- Step-by-step guided routine
- Timer + voice prompts
- Log meals
- Log weight
- Water intake tracking (with reminders if enabled in settings (disabled by default))
- Mood tracking
- Take a mirror selfie to track visual progress (optional)

### Progress tracking
- Weight chart
- Body measurements
- Streak counter
- Fat loss estimation

### AI coaching
- Chat interface for motivation and accountability
- Plan adjustments based on:

  - Missed workouts
  - Plateau
  - Weight changes
  - User feedback (too hard, too easy, etc.)
  - Low mood

Make it playful and addictive. Plus the UI should be beautiful and modern with a consistent design language across web and mobile.

## Gamification layer
Points system

Earn XP for:

- Completing workouts
- Logging meals
- Staying under calorie target
- Hitting streaks

Levels

- User levels up as they stay consistent.
- Unlock new workout “zones”.

Achievements

- 7-day streak
- First 2kg lost
- 30 workouts completed
- No sugar week

Daily challenges

- 15-min fat burn challenge
- No soda today
- 8k steps day

Avatars
- User has a character that becomes fitter as they progress.
- Visual progress increases retention.

Streak psychology

- Don’t break the chain.
- Send reminders if they are close to breaking a streak.
- Light penalty for missing too many days (lose XP, not progress).

## AI

Use AI for:
- Plan generation
- Dynamic calorie adjustments
- Habit reinforcement
- Motivation
- Behavioral insights

Prompt structure:
- System prompt defining the AI's role and constraints
- User context: structured JSON with:

  - Weight
  - Goal
  - Weekly progress
  - Compliance %
  - Mood score

AI should:
- Follow safety guidelines (no extreme calorie cuts, no medical claims)
- No eating disorder language
- Adjust calories by small increments (100–150 kcal max)
- Provide short, clear answers to avoid token overuse
- Use a playful, encouraging tone
- Encourage medical consultation if BMI extremely high/low

## Technical Requirements
The system must include:

* React Native mobile app (Android + iOS)
* Next.js + Tailwind web dashboard (user profile, subscription management, same functions as mobile api. Will be hosted on Firebase at the domain app.perfectshapeai.com).
* REST API backend. Deployable to Firebase Cloud Functions (Node.js with TypeScript).
* Firebase Authentication
* AI integration (via Cloudflare AI Gateway)
* In-app purchases (mobile)
* Freemius subscriptions (web). For integration details, see:- https://freemius.com/help/documentation/saas/saas-integration/
* In-app purchases and subscriptions must be tracked server-side via the REST API. The backend will verify receipts and manage subscription status.

The product must be playful, gamified, and addictive with streaks, XP, levels, and AI coaching.

Repository Structure

Create a monorepo with the following top-level folders:

/backend
/web
/react-native

Use a shared TypeScript configuration where possible. Make sure the brand colors and design tokens are consistent across web and mobile.

1. Backend (Node.js App)

Tech Stack

* Firebase Cloud Functions
* Firestore
* Firebase Admin SDK
* OpenAI SDK that communicates via Cloudflare AI Gateway

Hosting

Must be deployable to Firebase Cloud Functions.

Core Responsibilities

Authentication

* Use Firebase Authentication for identity.
* Backend must verify Firebase ID tokens using Firebase Admin SDK.
* No custom password handling in backend.
* Every protected route must verify user identity.

API Structure

Create REST endpoints grouped by:

/auth

* verify-token (optional internal)

/users

* get profile
* update profile

/weight

* log weight
* get weight history

/workouts

* get weekly plan
* mark workout complete
* get today’s workout

/meals

* log meal
* get calorie summary

/gamification

* get XP
* get streak
* get achievements

/ai

* generate weekly plan
* adjust plan
* coaching chat

/subscriptions

* verify mobile purchase receipt
* activate premium
* verify Freemius subscription

/freemius-webhook

* Handle subscription updates from Freemius

Database Schema (Minimum)

Users

* id
* firebase_uid
* email
* name
* height
* current_weight
* target_weight
* activity_level
* subscription_status
* created_at

FreemiusSubscriptions
* id
* user_id
* fs_license_id
* fs_plan_id
* fs_pricing_id
* fs_user_id
* type (subscription, lifetime)
* expiration
* is_canceled
* created_at

WeightLogs

* id
* user_id
* weight
* logged_at

WorkoutPlans

* id
* user_id
* week_number
* difficulty
* json_plan
* created_at

WorkoutLogs

* id
* user_id
* workout_id
* completed_at

DailyLogs

* id
* user_id
* calories_consumed
* workout_completed
* mood
* date

XP

* user_id
* total_xp
* level
* streak_count

AIConversations

* id
* user_id
* context_snapshot
* prompt
* response
* created_at

AI Integration Rules

* All AI calls must be server-side.
* Never expose AI API keys in mobile or web.
* Use structured JSON prompts.
* AI must follow safety constraints:

  * No extreme calorie cuts
  * No medical claims
  * Encourage safe weight loss

Implement a system prompt defining:
“You are a certified home fitness and nutrition coach focused on safe, sustainable weight loss without gym equipment.”

Gamification Logic (Backend)

Backend must calculate:

* XP for:

  * Workout completion
  * Logging meals
  * Hitting calorie target
  * Maintaining streak

* Streak logic:

  * Reset if user misses X days
  * XP penalty instead of full reset

Do not trust client for XP. Always compute server-side.

Subscription Logic

Mobile:

* Validate Google Play receipt
* Validate Apple receipt
* Store expiration date

Web:

* Freemius subscription verification webhook
* Update subscription_status

2. React Native App (/react-native)

Tech Stack

* React Native (TypeScript)
* React Navigation
* Zustand or Redux Toolkit
* Firebase SDK (Auth only)
* Secure storage for tokens
* Axios for API calls

Core Screens

Onboarding

* Collect user metrics
* Save to backend

Home Dashboard

* Today’s workout
* Calorie target
* Streak
* XP progress bar

Workout Screen

* Exercise list
* Timer
* Completion button

Weight Tracking

* Weight chart
* Add weight entry

AI Coach

* Chat interface
* Display structured responses

Profile

* Edit goals
* Subscription status

Gamification UI

* XP bar
* Level indicator
* Achievement badges
* Avatar progression

Push Notifications

* Daily reminder
* Streak warning
* Weekly progress message

Use Firebase Cloud Messaging.

Security

* Store Firebase ID token securely.
* Send token in Authorization header.
* Handle token refresh automatically.

In-App Purchases

* If the user already has an active subscription (via web or previous purchase (Apple or Google Play)), show premium features without asking to purchase again.
* Implement Google Play Billing
* Implement Apple IAP
* After purchase:

  * Send receipt to backend for verification
  * Unlock premium locally only after backend confirms

3. Web App (/web)

Tech Stack

* React (Vite or Next.js)
* TailwindCSS
* Firebase Auth
* window.fetch
* Freemius subscription integration

Purpose

* Features same as mobile app.
* But we use Freemius for web subscriptions instead of Google/Apple.
* Logged out users see a login page and download links for the mobile app.
* Don't worry about the marketing site (perfectshapeai.com) as it will be built with WordPress separately.
* If a user logs in on web, and they have an active subscription (via appstore or google play), they get premium features on web and mobile.

4. Shared Requirements

Environment Variables

Backend:

* DATABASE_URL
* FIREBASE_PROJECT_ID
* FIREBASE_PRIVATE_KEY
* CLOUDFLARE_AI_KEY
* FREEMIUS_SECRET_KEY
* FREEMIUS_SUBSCRIPTION_PLAN_ID
* FREEMIUS_ONE_TIME_PLAN_ID

Frontend:

* API_BASE_URL
* FIREBASE_CONFIG

Security

* Rate limit AI endpoints
* Protect against abuse
* Validate all request payloads
* No sensitive logic on client
* Protect against users who create multiple accounts to abuse free credits.

5. After creating account, users get  0.1 free credits. They also need to set up their profile (height, weight, goals) to get personalized plans. The first AI-generated workout plan is free, but subsequent ones cost credits. This encourages users to engage and see value before paying.

6. Code Quality Expectations

* TypeScript everywhere
* Clear folder structure inside each app
* Services layer for API calls
* No business logic inside UI components
* Use reusable hooks
* Proper error handling
* Basic unit tests for backend logic

7. UX Principles

* Short workouts (10–20 minutes)
* No gym equipment required
* Simple calorie guidance
* Playful tone
* Clean, modern UI
* Highly visual progress tracking
* Positive reinforcement from AI coach
* The app should feel worth the subscription cost by delivering real value and a delightful user experience.


End Goal

Deliver a scalable, AI-powered, gamified weight loss system that:

* Feels personal
* Encourages daily engagement
* Uses AI safely
* Supports low-cost subscriptions
* Is built cleanly for future expansion
* Maximizes user retention through gamification and coaching