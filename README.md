# Signature Stones Uganda — Autonomous Multi-Agent Sales Office & WhatsApp Pipeline

This system automates B2B lead discovery, WhatsApp sales conversations, and live deal escalation for **Signature Stones Uganda** ([@signaturestonesuganda on TikTok](https://www.tiktok.com/@signaturestonesuganda)).

---

## 🏢 Virtual Office Setup (The 4 Desks)

The dashboard is structured like a real physical company office with 4 specialized agent desks:

| Desk | Agent Name | Role | Responsibilities |
|---|---|---|---|
| **Desk 1** | **Sarah (Site Scout)** | Construction Scraper | Scrapes ongoing construction sites, residential villas at finishing stage, architects, and building contractors in Greater Kampala (Kira, Najjera, Kyanja, Naalya, Lubowa, Muyenga, etc.). |
| **Desk 2** | **David (Outreach Desk)** | WhatsApp Dispatcher | Dispatches personalized initial partnership proposals and stone catalogue links to verified mobile numbers. |
| **Desk 3** | **Grace (Stone Specialist)** | AI Sales & Tech Advisor | Handles incoming client questions on WhatsApp. Trained on stone varieties (quartzite, slate, split-face, cobblestones), pricing per m², free site measurements, and objection handling. |
| **Desk 4** | **The Boss Desk** | Sales Director / Closer | Receives **instant WhatsApp priority alerts** the moment a client requests a quote, site visit, or shares their location/measurements. |

---

## 🧠 WhatsApp Agent Training & Knowledge Base

The WhatsApp AI agent is trained through `knowledge_base.json` and `ai_brain.js`.

### 1. Products & Applications
* **Natural Wall Cladding Stones:** Golden Quartzite, Black Slate, Rustic Split-Face, Off-White Limestone, Grey Granite Veneer, Strip Cladding. (Used for perimeter boundary walls, gate pillars, house facades, balconies).
* **Compound Cobblestones & Pavers:** Hand-cut Granite Cobblestones, Basalt Setts, Stepping Stones. (Zero cracking under heavy vehicle parking, non-slip textured surfaces).
* **Interior Feature Walls:** 3D Textured Ledge Stone, Slate panels for living room TV console walls, fireplaces, and dining features.
* **Custom Granite & Quartz Tops:** Kitchen islands, breakfast bars, vanity slabs.

### 2. Pricing Rules (Uganda Context)
* **Wall Cladding (Supply Only):** UGX 45,000 – 65,000 / m²
* **Wall Cladding (Full Supply + Skilled Installation):** UGX 80,000 – 110,000 / m² (includes heavy-duty bonding adhesive, skilled masonry, joint grouting, and protective clear waterproofing sealant).
* **Compound Cobblestone Pavers:** UGX 85,000 – 120,000 / m² installed.
* **Kitchen Countertops:** from UGX 280,000 – 420,000 / running metre installed.

### 3. The Boss Escalation Rule
Whenever a prospect expresses high buying intent:
* Specifies a location (e.g. *"I am in Kira / Lubowa / Kyanja"*)
* Asks for measurement (e.g. *"Can you come measure my site?"*)
* Specifies size (e.g. *"I have 120 square meters"*)
* Requests quote/invoice (e.g. *"Send quotation / invoice"*)

**The Agent immediately:**
1. Reassures the customer that the Sales Director has received their specs and will call or message them within minutes to confirm the site visit.
2. Triggers an alert in the Virtual Office Dashboard.
3. Generates a 1-click WhatsApp alert formatted for the **Boss's phone number**:
   ```
   🚨 HOT CLIENT DEAL ALERT — SIGNATURE STONES UGANDA
   ━━━━━━━━━━━━━━━━━━━━
   👤 Client: Eng. Patrick Kigozi (+256706886449)
   📍 Location: Kira
   📐 Estimated Size: 120 sq meters
   💬 Client Request: "Can you come measure tomorrow?"
   ⚡ Action: Call or message client immediately to schedule free site visit & present sample box!
   ```

---

## 🚀 How to Launch the Virtual Office Dashboard

1. Open PowerShell or Terminal in this folder:
   ```bash
   cd "c:\Users\ssegu\OneDrive\my projects\signature-stones-lead-agent"
   ```
2. Start the office dashboard:
   ```bash
   npm start
   ```
3. Open your browser to:
   ```
   http://localhost:3000
   ```

You will see the **Virtual Office Setup** with animated desks, live activity logs, and the **interactive WhatsApp Simulator** on the right to test how the agent replies in real time.
