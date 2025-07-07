const { Fee, Payment } = require('../models/fees.model');
const User = require('../models/user.model');
const PDFDocument = require('pdfkit'); // For PDF export
const fs = require('fs');
const mongoose = require('mongoose');

// Get all fees
exports.getFees = async (req, res) => {
    try {
        const user = req.user;
        let fees;
        if (user.role === 'admin' || user.role === 'teacher') {
            fees = await Fee.find().populate('student', 'name rollNo class').lean();
        } else if (user.role === 'student') {
            fees = await Fee.find({ student: user._id }).populate('student', 'name rollNo class').lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const formattedFees = fees.map((fee) => ({
            id: fee._id,
            studentName: fee.student?.name || 'Unknown',
            rollNo: fee.student?.rollNo || fee.rollNo,
            class: fee.student?.class || fee.class,
            section: fee.section,
            type: fee.type,
            amount: fee.amount,
            dueDate: fee.dueDate.toISOString().split('T')[0],
            status: fee.status,
        }));
        res.status(200).json({ fees: formattedFees });
    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add new fee (Admin only)
exports.addFee = async (req, res) => {
    try {
        const { studentId, class: className, type, amount, dueDate } = req.body;
        const user = req.user;

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admin can add fees' });
        }
        if (!studentId || !className || !type || !amount || !dueDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate studentId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        const fee = new Fee({
            student: studentId,
            rollNo: student.rollNo || `STU${Date.now()}`,
            class: className,
            type,
            amount,
            dueDate: new Date(dueDate),
            status: 'Pending',
        });

        await fee.save();

        res.status(201).json({
            message: 'Fee added successfully',
            fee: {
                id: fee._id,
                studentName: student.name,
                rollNo: fee.rollNo,
                class: fee.class,
                section: fee.section,
                type: fee.type,
                amount: fee.amount,
                dueDate: fee.dueDate.toISOString().split('T')[0],
                status: fee.status,
            },
        });
    } catch (error) {
        console.error('Add fee error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Pay fee (Student/Parent only)
exports.payFee = async (req, res) => {
    try {
        const { method } = req.body;
        const user = req.user;
        const feeId = req.params.id;

        if (user.role !== 'student' && user.role !== 'parent') {
            return res.status(403).json({ message: 'Only students or parents can pay fees' });
        }
        if (!method) {
            return res.status(400).json({ message: 'Payment method is required' });
        }

        const fee = await Fee.findById(feeId);
        if (!fee) {
            return res.status(404).json({ message: 'Fee not found' });
        }
        if (fee.status === 'Paid') {
            return res.status(400).json({ message: 'Fee already paid' });
        }

        fee.status = 'Paid';
        await fee.save();

        const student = await User.findById(fee.student);
        const payment = new Payment({
            student: fee.student,
            rollNo: fee.rollNo,
            type: fee.type,
            amount: fee.amount,
            status: 'Completed',
            method,
        });

        await payment.save();

        res.status(200).json({
            message: 'Payment successful',
            payment: {
                id: payment._id,
                studentName: student.name,
                rollNo: payment.rollNo,
                date: payment.date.toISOString().split('T')[0],
                type: payment.type,
                amount: payment.amount,
                status: payment.status,
                method: payment.method,
            },
        });
    } catch (error) {
        console.error('Pay fee error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const user = req.user;
        let payments;
        if (user.role === 'admin' || user.role === 'teacher') {
            payments = await Payment.find().populate('student', 'name rollNo').lean();
        } else if (user.role === 'student') {
            payments = await Payment.find({ student: user._id }).populate('student', 'name rollNo').lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const formattedPayments = payments.map((payment) => ({
            id: payment._id,
            studentName: payment.student?.name || 'Unknown',
            rollNo: payment.student?.rollNo || payment.rollNo,
            date: payment.date.toISOString().split('T')[0],
            type: payment.type,
            amount: payment.amount,
            status: payment.status,
            method: payment.method,
        }));
        res.status(200).json({ payments: formattedPayments });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Export payment history as PDF
exports.exportReport = async (req, res) => {
    try {
        const user = req.user;
        let payments;
        if (user.role === 'admin') {
            payments = await Payment.find().populate('student', 'name rollNo').lean();
        } else if (user.role === 'student' || user.role === 'parent') {
            payments = await Payment.find({ student: user._id }).populate('student', 'name rollNo').lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        const doc = new PDFDocument();
        const fileName = 'payment_history.pdf';
        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);
        doc.fontSize(20).text('Payment History Report', { align: 'center' });
        doc.moveDown();
        payments.forEach((payment) => {
            doc.fontSize(12).text(
                `Student: ${payment.student?.name || 'Unknown'}, Roll No: ${payment.student?.rollNo || payment.rollNo}, Date: ${payment.date.toISOString().split('T')[0]}, Type: ${payment.type}, Amount: ₹${payment.amount}, Status: ${payment.status}, Method: ${payment.method}`
            );
            doc.moveDown();
        });
        doc.end();
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};