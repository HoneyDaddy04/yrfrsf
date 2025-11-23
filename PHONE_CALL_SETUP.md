# 📞 Phone Call Simulation Setup

## ✅ What's Been Added:

### **1. Incoming Call UI** (`IncomingCallModal.tsx`)
- Full-screen phone call interface
- Caller ID display with reminder details
- Answer/Decline buttons
- Ringing animation
- Ringtone audio

### **2. Active Call UI** (`ActiveCallModal.tsx`)
- Connected call screen
- Call duration timer
- AI speaking animation (audio waveform)
- Mute/Speaker/Hangup controls
- Visual feedback when AI is speaking

### **3. Nigerian AI Voice** (OpenAI TTS)
- Uses GPT-4 to generate Nigerian-style messages
- OpenAI TTS with "onyx" voice (deep, warm)
- Natural Nigerian greetings ("Hello o!", "Good day!")
- Warm, conversational tone

### **4. Call Manager Hook** (`useCallManager.ts`)
- Manages call states: idle → incoming → active → ended
- Listens for reminder triggers
- Handles answer/decline/hangup actions
- Auto-ends call when AI finishes speaking

---

## 🎯 How It Works:

### **Flow:**
1. **Reminder triggers** → Shows incoming call screen
2. **You click "Answer"** → Switches to active call screen
3. **AI voice plays** → Nigerian-accented voice speaks reminder
4. **Call auto-ends** → Returns to normal app

### **Call States:**
- `idle` - No call
- `incoming` - Phone ringing, show answer/decline
- `active` - Call connected, AI speaking
- `ended` - Call ending animation

---

## 🔊 Nigerian Voice Features:

### **AI Prompt:**
```
You are a friendly Nigerian person making a reminder call.
Use natural Nigerian expressions, be warm and encouraging.
Start with greetings like "Hello o!" or "Good day!"
```

### **Voice Settings:**
- **Model:** `tts-1` (OpenAI Text-to-Speech)
- **Voice:** `onyx` (Deep, warm - closest to Nigerian accent)
- **Speed:** `0.95` (Slightly slower for clarity)

### **Example Output:**
> "Hello o! Good day! This is your reminder for Morning Workout. 
> You wanted to start your day with energy at 6:30 AM. 
> Make it count! Have a blessed day!"

---

## 🎨 UI Features:

### **Incoming Call Screen:**
- ✅ Full-screen dark gradient background
- ✅ Large caller avatar (AI Reminder icon)
- ✅ Reminder title and description
- ✅ Pulsing animations
- ✅ Large Answer (green) and Decline (red) buttons
- ✅ Ringtone plays automatically

### **Active Call Screen:**
- ✅ Call duration timer (00:00)
- ✅ "Connected" status
- ✅ Audio waveform animation when AI speaks
- ✅ Mute/Speaker/Hangup controls
- ✅ Pulsing avatar when AI is speaking

---

## 🧪 Testing:

### **Quick Test (2 minutes):**

1. **Add API Key:**
   - Click "Settings"
   - Enter OpenAI API key
   - Enable "AI Voice Calls"
   - Save

2. **Create Test Reminder:**
   - Click "Create New Reminder"
   - Title: "Test Call"
   - Why: "Testing the phone simulation"
   - Time: 2 minutes from now
   - Click "Create"

3. **Wait for Call:**
   - After 2 minutes, incoming call screen appears
   - Ringtone plays
   - Click "Answer"
   - Hear Nigerian AI voice
   - Call auto-ends when done

---

## 📱 Ringtone Setup:

The app looks for `/public/ringtone.mp3`. You have 2 options:

### **Option 1: Use Default Browser Beep**
The empty file will cause a silent "ring" - the visual animation still works.

### **Option 2: Add Real Ringtone**
1. Download a ringtone MP3 file
2. Rename it to `ringtone.mp3`
3. Place in `/public/` folder
4. Refresh app

**Free ringtone sources:**
- https://www.zedge.net/ringtones
- https://www.mobile9.com/ringtones

---

## 🎛️ Customization:

### **Change Voice:**
Edit `src/utils/reminderScheduler.ts` line 270:
```typescript
voice: 'alloy',  // Female, friendly
voice: 'echo',   // Male, clear
voice: 'fable',  // British accent
voice: 'onyx',   // Deep, warm (current)
voice: 'nova',   // Female, energetic
voice: 'shimmer' // Female, soft
```

### **Change Speed:**
Line 271:
```typescript
speed: 1.0,  // Normal
speed: 0.9,  // Slower
speed: 1.1,  // Faster
```

### **Customize Nigerian Greeting:**
Edit the prompt on line 219-225 to add more Nigerian expressions!

---

## 🔧 Troubleshooting:

### **Call doesn't appear?**
- Check console for errors
- Verify API key is saved
- Ensure "AI Voice Calls" is enabled
- Check reminder is active

### **No voice plays?**
- Verify OpenAI API key is valid
- Check browser console for API errors
- Ensure you have API credits
- Check internet connection

### **Ringtone doesn't play?**
- Browser might block autoplay
- Add a real MP3 file to `/public/ringtone.mp3`
- Check browser audio permissions

### **Call doesn't auto-end?**
- AI might still be speaking
- Check console for "aiSpeakingEnd" event
- Click "Hangup" to manually end

---

## 💰 API Costs:

### **Per Reminder:**
- GPT-4 text generation: ~$0.003
- TTS audio generation: ~$0.015
- **Total per call: ~$0.018** (less than 2 cents!)

### **Monthly estimate:**
- 10 reminders/day = $5.40/month
- 5 reminders/day = $2.70/month

---

## 🚀 What's Next:

### **Possible Enhancements:**
1. **Custom ringtones** per reminder
2. **Video call simulation** with avatar
3. **Voice response** - talk back to AI
4. **Call history** - see past calls
5. **Snooze button** during call
6. **Multiple voices** - choose your caller

---

## ✨ Features Summary:

✅ Full-screen incoming call UI  
✅ Realistic phone interface  
✅ Answer/Decline buttons  
✅ Active call screen  
✅ Call duration timer  
✅ Nigerian AI voice (OpenAI TTS)  
✅ Natural Nigerian expressions  
✅ Audio waveform animation  
✅ Auto-end when AI finishes  
✅ Ringtone support  
✅ Mute/Speaker controls  

---

## 🎉 You're All Set!

**Restart your dev server** and test it out!

When a reminder triggers, you'll get a **full phone call experience** with a friendly Nigerian AI voice! 📞🇳🇬
