const Admission = require('../models/admission.model');

exports.submitAdmission = async (req, res) => {
  try {
    const { studentName, dateOfBirth, parentName, email, phone, address, previousSchool } = req.body;
    console.log('Submitting admission form:', JSON.stringify(req.body, null, 2));

    const newAdmission = new Admission({
      studentName,
      dateOfBirth,
      parentName,
      email,
      phone,
      address,
      previousSchool,
    });

    await newAdmission.save();
    console.log('Admission saved:', JSON.stringify(newAdmission, null, 2));

    res.status(201).json({ message: 'Admission form submitted successfully', admission: newAdmission });
  } catch (error) {
    console.error('Submit admission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};