import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search, SlidersHorizontal, Heart, Eye, EyeOff, ArrowRight, ArrowLeft,
  Calendar, MapPin, Check, QrCode, User, Bell, Moon
} from 'lucide-react';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const INITIAL_CATALOG = [
  { id: 1, name: 'Basketball', category: 'Indoor', rating: 4.9, available: 6, code: 'BB · 07', desc: 'Size 7 · Indoor / outdoor · Ready to play', img: '🏀' },
  { id: 2, name: 'Netball', category: 'Outdoor', rating: 4.9, available: 5, code: 'NB · 02', desc: 'Size 5 · Match grade · Ready to play', img: '🏐' },
  { id: 3, name: 'Football', category: 'Outdoor', rating: 4.8, available: 4, code: 'FB · 04', desc: 'Size 5 · FIFA quality · Ready to play', img: '⚽' },
  { id: 4, name: 'Badminton', category: 'Indoor', rating: 4.6, available: 8, code: 'BD · 11', desc: 'Yonex Carbon · Shuttlecock included', img: '🏸' },
  { id: 5, name: 'Bat & Ball', category: 'Outdoor', rating: 4.5, available: 7, code: 'CR · 01', desc: 'English Willow · Leather ball ready', img: '🏏' },
];

export default function App() {
  const [page, setPage] = useState('signin');
  const [profileTab, setProfileTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [user, setUser] = useState({
    fullName: '',
    nickName: '',
    field: 'Information Technology',
    phone: '',
    studentId: '',
    email: ''
  });

  const [equipment, setEquipment] = useState(INITIAL_CATALOG);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState(INITIAL_CATALOG[0]);
  const [selectedDate, setSelectedDate] = useState('Fri, 23 Oct 2026');
  const [selectedSlot, setSelectedSlot] = useState('4:00–6:00 PM');
  const [quantity, setQuantity] = useState(1);
  const [latestBooking, setLatestBooking] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [historyTab, setHistoryTab] = useState('Upcoming');

  const [notifs, setNotifs] = useState({
    general: true, sound: false, vibrate: true, billReminder: true
  });

  const loadStudentBookings = async (currentStudentId) => {
    if (!currentStudentId) {
      throw new Error('Your profile is missing a student ID.');
    }

    const { data } = await axios.get(API_URL + '/bookings');
    const formatted = data
      .filter(b => b.student_id === currentStudentId)
      .map(b => ({
        dbId: b.id,
        id: b.pass_code,
        equipmentId: b.equipment_id,
        equipmentName: b.equipment?.name,
        date: b.booking_date,
        slot: b.time_slot,
        quantity: b.quantity,
        status: b.status || 'Upcoming'
      }));
    setReservations(formatted);
  };

  const loadProfileAndBookings = async (userId, fallbackEmail) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, student_id, field, phone, email')
      .eq('id', userId)
      .single();

    if (error) throw error;

    setUser({
      fullName: profile.full_name || '',
      nickName: (profile.student_id || '').toLowerCase(),
      field: profile.field || 'Information Technology',
      phone: profile.phone || '',
      studentId: profile.student_id || '',
      email: profile.email || fallbackEmail || ''
    });
    await loadStudentBookings(profile.student_id);
  };

  useEffect(() => {
    axios.get(API_URL + '/equipment')
      .then(res => {
        if (res.data && res.data.length > 0) {
          const merged = res.data.map((item, idx) => ({
            ...INITIAL_CATALOG[idx % INITIAL_CATALOG.length],
            id: item.id,
            name: item.name,
            available: item.available
          }));
          setEquipment(merged);
        }
      })
      .catch(() => console.log('Running in local mode'));

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          setAuthUserId(session.user.id);
          await loadProfileAndBookings(session.user.id, session.user.email);
          setPage('equipment');
        }
      } catch (err) {
        console.error('Failed to restore authentication session:', err);
        setAuthError(err.message || 'Unable to restore your session.');
      }
    };

    initAuth();
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (page === 'signup') {
        if (password !== confirmPassword) {
          setAuthError('Passwords do not match.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: user.email,
          password
        });
        if (error) throw error;
        if (!data.user) throw new Error('Unable to create your account.');

        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: user.fullName,
          student_id: user.studentId,
          field: user.field,
          phone: user.phone,
          email: user.email
        });
        if (profileError) throw profileError;

        setAuthUserId(data.user.id);
        setUser(prev => ({ ...prev, nickName: user.studentId.toLowerCase() }));
        await loadStudentBookings(user.studentId);
        setPage('equipment');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password
        });
        if (error) throw error;
        if (!data.user) throw new Error('Unable to sign in.');

        setAuthUserId(data.user.id);
        await loadProfileAndBookings(data.user.id, data.user.email);
        setPage('equipment');
      }
    } catch (err) {
      console.error('Authentication failed:', err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authUserId) {
      setAuthError('No signed-in user was found.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: user.fullName,
          student_id: user.studentId,
          field: user.field,
          phone: user.phone
        })
        .eq('id', authUserId);
      if (error) throw error;
      setUser(prev => ({ ...prev, nickName: user.studentId.toLowerCase() }));
      setProfileTab('profile');
    } catch (err) {
      console.error('Failed to save profile:', err);
      setAuthError(err.message || 'Unable to save your profile.');
    }
  };

  const handleSignOut = async () => {
    setAuthError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthUserId(null);
      setPassword('');
      setConfirmPassword('');
      setReservations([]);
      setPage('signin');
    } catch (err) {
      console.error('Failed to sign out:', err);
      setAuthError(err.message || 'Unable to sign out.');
    }
  };

  const handleConfirmReservation = async () => {
    setAuthError('');
    setBookingLoading(true);
    const codeNum = Math.floor(10 + Math.random() * 89);
    const newPass = {
      dbId: null,
      id: 'ITUM-261023-0' + codeNum,
      shortCode: '0' + codeNum + ' – 23',
      equipmentId: selectedItem.id,
      equipmentName: selectedItem.name,
      img: selectedItem.img,
      quantity,
      date: selectedDate,
      slot: selectedSlot,
      status: 'Upcoming'
    };

    try {
      const response = await axios.post(API_URL + '/bookings', {
        studentId: user.studentId || 'GUEST',
        studentName: user.fullName || 'ITUM Student',
        equipmentId: selectedItem.id,
        quantity,
        date: selectedDate,
        timeSlot: selectedSlot
      });
      if (response.data) {
        newPass.dbId = response.data.id;
        if (response.data.pass_code) {
          newPass.id = response.data.pass_code;
        }
      }
      setEquipment(prev =>
        prev.map(eq => eq.id === selectedItem.id ? { ...eq, available: Math.max(0, eq.available - quantity) } : eq)
      );
      setReservations(prev => [newPass, ...prev]);
      setLatestBooking(newPass);
      setPage('complete');
    } catch (err) {
      console.error('Booking failed:', err);
      setAuthError(err.response?.data?.error || err.message || 'Unable to reserve this equipment.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelReservation = async (resItem) => {
    setAuthError('');
    try {
      if (resItem.dbId) {
        await axios.patch(API_URL + '/bookings/' + resItem.dbId, {
          status: 'Cancelled'
        });
      }

      setReservations(prev =>
        prev.map(r => r.dbId === resItem.dbId ? { ...r, status: 'Cancelled' } : r)
      );

      setEquipment(prev =>
        prev.map(eq =>
          eq.id === resItem.equipmentId
            ? { ...eq, available: eq.available + resItem.quantity }
            : eq
        )
      );
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
      setAuthError(err.response?.data?.error || err.message || 'Failed to cancel the reservation.');
    }
  };
  const renderNavbar = () => (
    <header className="bg-black text-white px-6 md:px-14 py-4 flex items-center justify-between">
      <button onClick={() => setPage('equipment')} className="text-xl font-bold tracking-wider">ITUM</button>
      <nav className="flex items-center gap-8 text-sm">
        <button onClick={() => setPage('equipment')} className={['equipment', 'reserve', 'complete'].includes(page) ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'}>Equipment</button>
        <button onClick={() => setPage('reservations')} className={page === 'reservations' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'}>My reservations</button>
        <button onClick={() => setPage('profile')} className={page === 'profile' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'}>Profile</button>
      </nav>
    </header>
  );

  if (page === 'signin' || page === 'signup') {
    const isSignIn = page === 'signin';
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-white">
        <div
          className="md:w-1/2 relative bg-zinc-900 text-white flex flex-col justify-between p-10 min-h-[280px]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url('/login-bg.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold">IT</div>
            <div>
              <h2 className="font-bold tracking-widest text-lg">ITUM</h2>
              <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-200">Sports Equipment Availability</p>
            </div>
          </div>
          <p className="text-xs text-zinc-300 hidden md:block">Institute of Technology, University of Moratuwa</p>
        </div>

        <div className="md:w-1/2 flex flex-col justify-between p-8 md:p-16">
          <div className="text-sm font-medium tracking-wider text-zinc-800">ITUM <span className="text-zinc-400 mx-1">/</span> SPORTS</div>

          <div className="max-w-md w-full mx-auto my-auto py-8">
            <p className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2">{isSignIn ? 'SIGN IN' : 'CREATE AN ACCOUNT'}</p>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">{isSignIn ? 'Connect With Us!' : 'Hey, Hello'}</h1>
            {!isSignIn && <p className="text-sm text-zinc-500 mb-6">Enter your credentials to access your account</p>}

            <form onSubmit={handleAuthSubmit} className="space-y-5 mt-6">
              {!isSignIn && (
                <>
                  <input type="text" required placeholder="Full name" value={user.fullName} onChange={e => setUser({ ...user, fullName: e.target.value })} className="w-full border-b border-zinc-200 py-3 text-sm focus:outline-none focus:border-black" />
                  <input type="text" required placeholder="Student ID (e.g., 24IT8678)" value={user.studentId} onChange={e => setUser({ ...user, studentId: e.target.value })} className="w-full border-b border-zinc-200 py-3 text-sm focus:outline-none focus:border-black" />
                </>
              )}

              <input type="email" required placeholder="Email address" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} className="w-full border-b border-zinc-200 py-3 text-sm focus:outline-none focus:border-black" />

              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-b border-zinc-200 py-3 text-sm focus:outline-none focus:border-black pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-3 text-zinc-400 hover:text-black">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {!isSignIn && (
                <input type="password" required placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border-b border-zinc-200 py-3 text-sm focus:outline-none focus:border-black" />
              )}

              {authError && <p className="text-xs text-red-500">{authError}</p>}

              {isSignIn && (
                <div className="text-right"><button type="button" className="text-xs text-zinc-600 hover:text-black">Forgot Password?</button></div>
              )}

              <button type="submit" disabled={authLoading} className="w-full bg-black text-white rounded-full py-3.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition disabled:opacity-50">
                {authLoading ? 'Please wait...' : isSignIn ? 'Sign In' : 'Create an account'} <ArrowRight size={16} />
              </button>
            </form>

            <div className="text-center mt-8 text-xs text-zinc-500">
              {isSignIn ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setAuthError(''); setPage(isSignIn ? 'signup' : 'signin'); }} className="font-bold text-black uppercase tracking-wider hover:underline">
                {isSignIn ? 'SIGN UP' : 'SIGN IN'}
              </button>
            </div>
          </div>

          <div className="text-xs text-zinc-400">Sports equipment availability</div>
        </div>
      </div>
    );
  }

  if (page === 'equipment') {
    const filtered = equipment.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (categoryFilter === 'All' || item.category.toLowerCase() === categoryFilter.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        {renderNavbar()}
        <main className="max-w-6xl w-full mx-auto px-6 py-12 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2">SPORTS EQUIPMENT AVAILABILITY</p>
          <h1 className="text-4xl font-bold text-zinc-900 mb-8">Find your next game.</h1>

          <div className="flex items-center gap-3 max-w-md mb-6">
            <div className="flex items-center bg-white rounded-full px-4 py-3 shadow-sm border border-zinc-100 flex-1">
              <Search size={18} className="text-zinc-400 mr-3" />
              <input type="text" placeholder="Search equipment..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full text-sm focus:outline-none" />
            </div>
            <button className="bg-[#231919] text-white p-3.5 rounded-xl hover:bg-black"><SlidersHorizontal size={18} /></button>
          </div>

          <div className="flex gap-3 mb-10">
            {['All', 'Indoor', 'Outdoor'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={'px-6 py-2 rounded-full text-xs font-medium transition ' + (categoryFilter === cat ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {filtered.map(item => (
              <div key={item.id} onClick={() => { setSelectedItem(item); setQuantity(1); setPage('reserve'); }} className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 hover:shadow-md transition cursor-pointer flex flex-col justify-between group">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">{item.available} available</span>
                  <Heart size={18} className="text-zinc-400 group-hover:text-red-500 transition" />
                </div>
                <div className="text-7xl my-10 text-center select-none group-hover:scale-105 transition">{item.img}</div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">{item.name}</h3>
                  <p className="text-xs text-amber-500 font-semibold mt-1">★ {item.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
        <footer className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between text-xs text-zinc-400">
          <span>ITUM SPORTS</span>
          <span>Equipment / Reserve / Play</span>
        </footer>
      </div>
    );
  }

  if (page === 'reserve') {
    const dates = [
      { day: 'THU', num: '22', full: 'Thu, 22 Oct 2026' },
      { day: 'FRI', num: '23', full: 'Fri, 23 Oct 2026' },
      { day: 'SAT', num: '24', full: 'Sat, 24 Oct 2026' },
      { day: 'SUN', num: '25', full: 'Sun, 25 Oct 2026' },
      { day: 'MON', num: '26', full: 'Mon, 26 Oct 2026' },
    ];
    const slots = [
      { time: '2:00–4:00 PM', status: 'Available' },
      { time: '4:00–6:00 PM', status: 'Available' },
      { time: '6:00–8:00 PM', status: 'Booked' },
    ];

    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        {renderNavbar()}
        <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setPage('equipment')} className="flex items-center gap-3 text-sm font-medium text-zinc-700 hover:text-black">
              <ArrowLeft size={18} /> Reserve equipment
            </button>
            <span className="text-xs text-zinc-400 font-mono">01 / 02</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <section className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-zinc-100">
              <div className="flex items-start gap-5 mb-8">
                <div className="text-6xl">{selectedItem.img}</div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-zinc-400">{selectedItem.category} equipment</p>
                  <h1 className="text-2xl font-bold text-zinc-900 mt-1">{selectedItem.name}</h1>
                  <p className="text-sm text-zinc-500 mt-2">{selectedItem.desc}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-3">{selectedItem.available} available</p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="font-semibold text-zinc-900 flex items-center gap-2 mb-4"><Calendar size={17} /> Choose a date</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {dates.map(date => (
                    <button key={date.full} onClick={() => setSelectedDate(date.full)} className={'rounded-2xl border px-3 py-3 text-center transition ' + (selectedDate === date.full ? 'border-black bg-black text-white' : 'border-zinc-200 hover:border-zinc-500')}>
                      <span className="block text-[10px] tracking-wider">{date.day}</span>
                      <span className="block text-lg font-bold mt-1">{date.num}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-semibold text-zinc-900 flex items-center gap-2 mb-4"><MapPin size={17} /> Choose a time slot</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {slots.map(slot => (
                    <button key={slot.time} disabled={slot.status === 'Booked'} onClick={() => setSelectedSlot(slot.time)} className={'rounded-xl border px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ' + (selectedSlot === slot.time ? 'border-black bg-zinc-900 text-white' : 'border-zinc-200 hover:border-zinc-500')}>
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <aside className="bg-white rounded-3xl p-7 shadow-sm border border-zinc-100 h-fit">
              <h2 className="text-lg font-bold text-zinc-900">Reservation summary</h2>
              <div className="flex justify-between items-center py-5 mt-3 border-b border-zinc-100">
                <span className="text-sm text-zinc-500">Quantity</span>
                <div className="flex items-center gap-4">
                  <button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))} className="w-8 h-8 rounded-full border border-zinc-200 disabled:opacity-40">−</button>
                  <span className="font-semibold">{quantity}</span>
                  <button aria-label="Increase quantity" disabled={quantity >= selectedItem.available} onClick={() => setQuantity(value => Math.min(selectedItem.available, value + 1))} className="w-8 h-8 rounded-full border border-zinc-200 disabled:opacity-40">+</button>
                </div>
              </div>
              <div className="py-5 border-b border-zinc-100 text-sm">
                <p className="text-zinc-500">{selectedDate}</p>
                <p className="font-medium text-zinc-900 mt-1">{selectedSlot}</p>
              </div>
              {authError && <p className="text-xs text-red-500 mt-4">{authError}</p>}
              <button onClick={handleConfirmReservation} disabled={bookingLoading || quantity > selectedItem.available} className="w-full bg-black text-white rounded-full py-3.5 mt-6 text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-50">
                {bookingLoading ? 'Reserving...' : 'Confirm reservation'}
              </button>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  if (page === 'complete') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        {renderNavbar()}
        <main className="max-w-2xl w-full mx-auto px-6 py-16 flex-1">
          <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-zinc-100 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto"><Check size={30} /></div>
            <p className="text-[11px] uppercase tracking-widest text-zinc-400 mt-6">RESERVATION CONFIRMED</p>
            <h1 className="text-3xl font-bold text-zinc-900 mt-2">You're all set.</h1>
            <p className="text-sm text-zinc-500 mt-3">Your equipment is ready for game day.</p>
            {latestBooking && (
              <div className="mt-8 rounded-2xl bg-zinc-50 p-6 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-400">PASS CODE</p>
                    <p className="font-mono font-semibold mt-1">{latestBooking.id}</p>
                  </div>
                  <QrCode size={32} className="text-zinc-500" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                  <div><p className="text-zinc-400">Equipment</p><p className="font-medium mt-1">{latestBooking.equipmentName}</p></div>
                  <div><p className="text-zinc-400">Quantity</p><p className="font-medium mt-1">{latestBooking.quantity}</p></div>
                  <div><p className="text-zinc-400">Date</p><p className="font-medium mt-1">{latestBooking.date}</p></div>
                  <div><p className="text-zinc-400">Time</p><p className="font-medium mt-1">{latestBooking.slot}</p></div>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button onClick={() => setPage('reservations')} className="flex-1 rounded-full bg-black text-white py-3 text-sm font-medium">View reservations</button>
              <button onClick={() => setPage('equipment')} className="flex-1 rounded-full border border-zinc-200 py-3 text-sm font-medium hover:bg-zinc-50">Browse equipment</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (page === 'reservations') {
    const visibleReservations = reservations.filter(res => res.status === historyTab);
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        {renderNavbar()}
        <main className="max-w-6xl w-full mx-auto px-6 py-12 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2">YOUR ACTIVITY</p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900">My reservations</h1>
              <p className="text-sm text-zinc-500 mt-2">Keep track of your sports equipment bookings.</p>
            </div>
            <div className="flex gap-2">
              {['Upcoming', 'Completed', 'Cancelled'].map(tab => (
                <button key={tab} onClick={() => setHistoryTab(tab)} className={'px-4 py-2 rounded-full text-xs font-medium transition ' + (historyTab === tab ? 'bg-black text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400')}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {authError && <p className="text-sm text-red-500 mb-4">{authError}</p>}
          {visibleReservations.length ? (
            <div className="space-y-4">
              {visibleReservations.map(res => (
                <article key={res.dbId || res.id} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 flex flex-col md:flex-row md:items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center text-4xl">{equipment.find(item => item.id === res.equipmentId)?.img || '🏅'}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-bold text-lg text-zinc-900">{res.equipmentName || equipment.find(item => item.id === res.equipmentId)?.name || 'Sports Equipment'}</h2>
                      <span className={'px-2.5 py-1 rounded-full text-[10px] font-medium ' + (res.status === 'Upcoming' ? 'bg-emerald-50 text-emerald-700' : res.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-600')}>{res.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500 mt-3">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {res.date}</span>
                      <span>{res.slot}</span>
                      <span>Quantity: {res.quantity}</span>
                      <span className="font-mono">{res.id}</span>
                    </div>
                  </div>
                  {res.status === 'Upcoming' && (
                    <button onClick={() => handleCancelReservation(res)} className="rounded-full border border-red-200 text-red-600 px-5 py-2.5 text-xs font-medium hover:bg-red-50 transition">
                      Cancel Reservation
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-zinc-100 p-12 text-center">
              <Calendar size={28} className="mx-auto text-zinc-300" />
              <p className="font-semibold text-zinc-800 mt-4">No {historyTab.toLowerCase()} reservations</p>
              <p className="text-sm text-zinc-500 mt-1">Your reservations will appear here.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (page === 'profile') {
    const isEditing = profileTab === 'edit';
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        {renderNavbar()}
        <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-zinc-400 mb-2">ACCOUNT</p>
          <h1 className="text-4xl font-bold text-zinc-900 mb-8">Profile</h1>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
            <aside className="space-y-2">
              <button onClick={() => setProfileTab('profile')} className={'w-full text-left rounded-xl px-4 py-3 text-sm flex items-center gap-3 ' + (!isEditing && profileTab !== 'preferences' ? 'bg-black text-white' : 'text-zinc-600 hover:bg-white')}><User size={17} /> Personal details</button>
              <button onClick={() => setProfileTab('preferences')} className={'w-full text-left rounded-xl px-4 py-3 text-sm flex items-center gap-3 ' + (profileTab === 'preferences' ? 'bg-black text-white' : 'text-zinc-600 hover:bg-white')}><Bell size={17} /> Preferences</button>
              <button onClick={handleSignOut} className="w-full text-left rounded-xl px-4 py-3 text-sm text-red-600 hover:bg-red-50">Sign Out</button>
            </aside>
            <section className="bg-white rounded-3xl p-7 md:p-9 shadow-sm border border-zinc-100">
              {authError && <p className="text-sm text-red-500 mb-5">{authError}</p>}
              {profileTab === 'preferences' ? (
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Preferences</h2>
                  <p className="text-sm text-zinc-500 mt-1 mb-6">Manage how you want to receive updates.</p>
                  {[
                    ['general', 'General notifications', <Bell size={17} />],
                    ['sound', 'Sound', <Moon size={17} />],
                    ['vibrate', 'Vibration', <span className="text-lg">◌</span>],
                    ['billReminder', 'Booking reminders', <Calendar size={17} />]
                  ].map(([key, label, icon]) => (
                    <label key={key} className="flex items-center justify-between py-4 border-b border-zinc-100 cursor-pointer">
                      <span className="flex items-center gap-3 text-sm text-zinc-700">{icon}{label}</span>
                      <input type="checkbox" checked={notifs[key]} onChange={e => setNotifs(prev => ({ ...prev, [key]: e.target.checked }))} className="accent-black w-4 h-4" />
                    </label>
                  ))}
                </div>
              ) : isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">Edit profile</h2>
                    <p className="text-sm text-zinc-500 mt-1">Update your personal information.</p>
                  </div>
                  <label className="block text-xs font-medium text-zinc-600">Full name
                    <input required value={user.fullName} onChange={e => setUser(prev => ({ ...prev, fullName: e.target.value }))} className="mt-2 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">Student ID
                    <input required value={user.studentId} onChange={e => setUser(prev => ({ ...prev, studentId: e.target.value }))} className="mt-2 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">Field of study
                    <input value={user.field} onChange={e => setUser(prev => ({ ...prev, field: e.target.value }))} className="mt-2 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">Phone
                    <input type="tel" value={user.phone} onChange={e => setUser(prev => ({ ...prev, phone: e.target.value }))} className="mt-2 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black" />
                  </label>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="rounded-full bg-black text-white px-6 py-3 text-sm font-medium">Save changes</button>
                    <button type="button" onClick={() => { setAuthError(''); setProfileTab('profile'); }} className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-medium hover:bg-zinc-50">Cancel</button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">Personal details</h2>
                      <p className="text-sm text-zinc-500 mt-1">Your account information.</p>
                    </div>
                    <button onClick={() => { setAuthError(''); setProfileTab('edit'); }} className="rounded-full border border-zinc-200 px-5 py-2 text-xs font-medium hover:bg-zinc-50">Edit profile</button>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    {[
                      ['Full name', user.fullName],
                      ['Student ID', user.studentId],
                      ['Email address', user.email],
                      ['Field of study', user.field],
                      ['Phone', user.phone || 'Not provided']
                    ].map(([label, value]) => (
                      <div key={label} className="py-4 border-b border-zinc-100">
                        <dt className="text-xs text-zinc-400">{label}</dt>
                        <dd className="text-sm font-medium text-zinc-800 mt-1">{value || 'Not provided'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
