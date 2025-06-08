const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // or wherever your HTML files are

app.post('/send-cart', async (req, res) => {
  const { name, website, email, comments, cart } = req.body;

  const html = `
    <h3>New Trade Request from ${name}</h3>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Website:</strong> ${website || '—'}</p>
    <p><strong>Comments:</strong><br>${comments || '—'}</p>
    <hr>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>Band</th><th>Date</th><th>Location</th><th>Source</th></tr></thead>
      <tbody>
        ${cart.map(show => `
          <tr>
            <td>${show.artist}</td>
            <td>${show.date}</td>
            <td>${show.location}</td>
            <td>${show.source}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;

  const transporter = nodemailer.createTransport({
    service: 'gmail', // or another SMTP service
    auth: {
      user: 'your@email.com',        // replace with yours
      pass: 'your_app_password'      // use Gmail App Passwords or SMTP key
    }
  });

  try {
    await transporter.sendMail({
      from: 'no-reply@vortextradelist.com',
      to: [email, 'your@email.com'],
      subject: `🎫 Trade Request from ${name}`,
      html
    });

    res.status(200).send('Sent');
  } catch (err) {
    console.error(err);
    res.status(500).send('Email failed');
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));