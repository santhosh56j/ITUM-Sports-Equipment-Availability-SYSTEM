require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.get('/api/equipment', async (req, res) => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/bookings', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, equipment(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/bookings', async (req, res) => {
  const { studentId, studentName, equipmentId, quantity, date, timeSlot } = req.body;
  const passCode = 'ITUM-' + Math.floor(100000 + Math.random() * 900000);

  const { data: item, error: fetchErr } = await supabase
    .from('equipment')
    .select('available')
    .eq('id', equipmentId)
    .single();

  if (fetchErr || !item) return res.status(404).json({ error: 'Equipment not found' });
  if (item.available < quantity) return res.status(400).json({ error: 'Not enough stock available' });

  const { data: booking, error: insertErr } = await supabase
    .from('bookings')
    .insert([{
      pass_code: passCode,
      student_id: studentId,
      student_name: studentName,
      equipment_id: equipmentId,
      quantity,
      booking_date: date,
      time_slot: timeSlot
    }])
    .select()
    .single();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  await supabase
    .from('equipment')
    .update({ available: item.available - quantity })
    .eq('id', equipmentId);

  res.status(201).json(booking);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('ITUM Sports Backend connected to Supabase on port ' + PORT));
// PATCH update booking status (Cancelled or Completed) and restore stock
app.patch('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Cancelled' or 'Completed'

  // 1. Fetch the existing booking
  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // 2. Update booking status
  const { data: updated, error: updateErr } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message });
  }

  // 3. Restore stock if status changed from Upcoming to Cancelled or Completed
  if (booking.status === 'Upcoming' && (status === 'Cancelled' || status === 'Completed')) {
    const { data: item } = await supabase
      .from('equipment')
      .select('available')
      .eq('id', booking.equipment_id)
      .single();

    if (item) {
      await supabase
        .from('equipment')
        .update({ available: item.available + booking.quantity })
        .eq('id', booking.equipment_id);
    }
  }

  res.json(updated);
});
