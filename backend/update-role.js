const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

mongoose.connect('mongodb://localhost:27017/mentecart')
  .then(() => {
    console.log('Connected to MongoDB');
    return User.updateOne(
      { _id: mongoose.Types.ObjectId.createFromHexString('6a054f21144be14269fd772a') },
      { role: 'admin' }
    );
  })
  .then(result => {
    console.log('Update result:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
