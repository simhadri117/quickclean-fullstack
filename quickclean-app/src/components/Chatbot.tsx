import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Minimize2, Send, Mic, MicOff, RefreshCw } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import './Chatbot.css';

type Sender = 'bot' | 'user';

interface Message {
  id: string;
  text: string;
  sender: Sender;
  options?: string[];
  selectedOption?: string;
}

type ChatStep = 'GREETING' | 'SERVICE' | 'DATE' | 'TIME' | 'CONFIRM' | 'DONE';

interface BookingData {
  service?: { name: string; price: number };
  date?: string;
  time?: string;
}

// Check for browser speech recognition support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState<ChatStep>('GREETING');
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [inputText, setInputText] = useState('');
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial greeting when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      triggerInitialGreeting();
    }
  }, [isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Real-time listener for payment confirmation
  useEffect(() => {
    if (!paymentBookingId) return;

    const unsubscribe = onSnapshot(doc(db, 'bookings', paymentBookingId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'COMPLETED') {
          // Announce success
          setIsOpen(true);
          setStep('DONE');
          addBotMessage(`✅ Your booking is confirmed!\nService: ${data.service?.name || data.service}\nDate: ${data.date}\nTime: ${data.time}\n\nA vetted cleaner is being dispatched.`);
          setPaymentBookingId(null);
          localStorage.removeItem('bookingId'); // cleanup
        }
      }
    });

    return () => unsubscribe();
  }, [paymentBookingId]);

  const triggerInitialGreeting = () => {
    simulateBotTyping(() => {
      addBotMessage(
        "Hello 👋 Welcome to QuickClean!\nHow can I help you today?",
        ["Book a Service", "Track Booking", "Pricing Info", "Talk to Support"]
      );
    });
  };

  const addBotMessage = (text: string, options?: string[]) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'bot', options }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user' }]);
  };

  const simulateBotTyping = (callback: () => void) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, 1000);
  };

  const markOptionSelected = (messageId: string, option: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, selectedOption: option } : msg
    ));
  };

  const getNext3Days = () => {
    const dates = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    return dates;
  };

  const handleRefresh = () => {
    setMessages([]);
    setStep('GREETING');
    setBookingData({});
    setInputText('');
    setIsListening(false);
    triggerInitialGreeting();
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');
    addUserMessage(userText);
    
    // Smart Detection (Booking Intent)
    if (/(book|cleaning|service)/i.test(userText) && step === 'GREETING') {
      simulateBotTyping(() => {
        setStep('SERVICE');
        addBotMessage("Sure! What type of cleaning service do you need?", ["Home Cleaning", "Bathroom Cleaning", "Kitchen Cleaning"]);
      });
      return;
    }

    // Otherwise, call AI for free-text conversations
    setIsTyping(true);
    try {
      const history = messages.map(m => ({
        role: m.sender === 'bot' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history })
      });

      const data = await res.json();
      setIsTyping(false);

      if (res.ok && data.reply) {
        addBotMessage(data.reply);
      } else {
        addBotMessage(data.error || "I'm having trouble connecting to my brain right now. Can we try that again?");
      }
    } catch (error) {
      console.error(error);
      setIsTyping(false);
      addBotMessage("Oops, something went wrong on my end!");
    }
  };

  const handleOptionClick = async (messageId: string, option: string) => {
    // Disable selecting multiple options
    const targetMessage = messages.find(m => m.id === messageId);
    if (targetMessage?.selectedOption) return;

    markOptionSelected(messageId, option);
    addUserMessage(option);

    simulateBotTyping(async () => {
      switch (step) {
        case 'GREETING':
          if (option === 'Book a Service') {
            setStep('SERVICE');
            addBotMessage("Great! What type of cleaning do you need?", ["Home Cleaning", "Bathroom Cleaning", "Kitchen Cleaning"]);
          } else {
            // Send selected preset text to AI as well!
            setIsTyping(true);
            try {
              const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: option, history: [] })
              });
              const data = await res.json();
              setIsTyping(false);
              if (res.ok && data.reply) {
                addBotMessage(data.reply);
              } else {
                addBotMessage(`I'm sorry, I'm having trouble processing that right now. (Error: ${data.error || 'Server issue'})`);
              }
            } catch {
              setIsTyping(false);
              addBotMessage(`You selected "${option}". Unfortunately, I'm offline right now.`);
            }
          }
          break;

        case 'SERVICE':
          let price = 149;
          if (option === 'Bathroom Cleaning' || option === 'Kitchen Cleaning') price = 199;
          
          setBookingData(prev => ({ 
            ...prev, 
            service: { name: option, price: price } as any 
          }));
          setStep('DATE');
          addBotMessage("Please select a date", getNext3Days());
          break;

        case 'DATE':
          setBookingData(prev => ({ ...prev, date: option }));
          setStep('TIME');
          addBotMessage("Select a time slot", ["Morning (9AM-12PM)", "Afternoon (12PM-4PM)", "Evening (4PM-8PM)"]);
          break;

        case 'TIME':
          setBookingData(prev => ({ ...prev, time: option }));
          setStep('CONFIRM');
          addBotMessage(`Almost done! Do you want to confirm your ${bookingData.service?.name} on ${bookingData.date} during the ${option}?`, ["Confirm ✅", "Cancel ❌"]);
          break;

        case 'CONFIRM':
          if (option === "Confirm ✅") {
            try {
              const user = auth.currentUser;
              const docRef = await addDoc(collection(db, 'bookings'), {
                ...bookingData,
                userId: user?.uid || 'anonymous',
                userEmail: user?.email || 'anonymous',
                status: 'pending',
                source: 'chatbot',
                createdAt: serverTimestamp()
              });
              
              const newBookingId = docRef.id;
              localStorage.setItem('bookingId', newBookingId);
              setPaymentBookingId(newBookingId);
              
              setStep('DONE');
              addBotMessage("Booking initialized! Redirecting to secure payment...");
              
              setTimeout(() => {
                setIsOpen(false);
                navigate('/checkout');
              }, 1500);

            } catch (error) {
              console.error("Error saving booking:", error);
              addBotMessage("Oops, something went wrong while saving your booking. Please try again later.");
            }
          } else {
            setStep('DONE');
            addBotMessage("Booking cancelled. Let me know if you need anything else!");
          }
          break;

        case 'DONE':
          // They might type something else after done, we can just answer it with AI.
          if (option) {
            // Handled similarly to greeting
          }
          break;
      }
    });
  };

  return (
    <div className="chatbot-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="chatbot-window"
          >
            <div className="chatbot-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
                <span>Support Assistant</span>
              </div>
              <div className="chatbot-header-actions">
                <button onClick={handleRefresh} title="Restart Conversation"><RefreshCw size={18} /></button>
                <button onClick={() => setIsOpen(false)} title="Minimize"><Minimize2 size={18} /></button>
              </div>
            </div>

            <div className="chatbot-messages">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`chat-bubble ${msg.sender}`}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {msg.text}
                  {msg.options && msg.sender === 'bot' && (
                    <div className="quick-replies">
                      {msg.options.map((opt) => (
                        <button
                          key={opt}
                          className={`quick-reply-btn ${msg.selectedOption === opt ? 'selected' : ''}`}
                          disabled={!!msg.selectedOption}
                          onClick={() => handleOptionClick(msg.id, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form for Free Text */}
            <form className="chatbot-input-container" onSubmit={handleSendText}>
              {SpeechRecognition && (
                <button
                  type="button"
                  className={`chatbot-mic-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListen}
                  disabled={step !== 'GREETING' && step !== 'DONE'}
                  title="Voice Input"
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}
              <input 
                type="text" 
                className="chatbot-input" 
                placeholder={step === 'GREETING' || step === 'DONE' ? (isListening ? "Listening..." : "Type a message...") : "Please select an option above"} 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={step !== 'GREETING' && step !== 'DONE' && isTyping}
              />
              <button 
                type="submit" 
                className="chatbot-send-btn"
                disabled={!inputText.trim() || (step !== 'GREETING' && step !== 'DONE')}
              >
                <Send size={16} />
              </button>
            </form>

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="chatbot-toggle"
            onClick={() => setIsOpen(true)}
          >
            <MessageCircle size={28} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
