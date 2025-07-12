const mongoose = require('mongoose');
const Fee = require('../models/fees.model');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const PDFDocument = require('pdfkit');

// Get all fees
exports.getFees = async (req, res) => {
    try {
        const user = req.user;
        let fees;
        if (user.role === 'admin' || user.role === 'teacher' || user.role === 'student') {
            fees = await Fee.find().populate('studentId', 'name rollNo class').lean();
        } else if (user.role === 'student' || user.role === 'parent') {
            fees = await Fee.find({ studentId: user._id }).populate('studentId', 'name rollNo class').lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const formattedFees = fees.map((fee) => ({
            id: fee._id,
            studentName: fee.studentId?.name || 'Unknown',
            rollNo: fee.studentId?.rollNo || fee.rollNo,
            class: fee.studentId?.class || fee.class,
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
// Add class-wise fee (Admin only)
exports.addFee = async (req, res) => {
    try {
        const { class: className, type, amount, dueDate } = req.body;
        const user = req.user;

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can add fees' });
        }
        if (!className || !type || !amount || !dueDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate class
        const validClasses = [
            'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
            'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
        ];
        if (!validClasses.includes(className)) {
            return res.status(400).json({ message: 'Invalid class' });
        }

        // Validate fee type
        const validFeeTypes = [
            'Tuition Fee', 'Exam Fee', 'Library Fee', 'Sports Fee', 'Transport Fee', 'Miscellaneous',
        ];
        if (!validFeeTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid fee type' });
        }

        // Fetch students in the class
        const students = await User.find({ role: 'student', class: className }).select('_id name rollNo');
        if (students.length === 0) {
            return res.status(404).json({ message: `No students found in ${className}` });
        }

        // Create fee entries for all students in the class
        const fees = await Promise.all(
            students.map(async (student) => {
                const fee = new Fee({
                    studentId: student._id,
                    studentName: student.name,
                    rollNo: student.rollNo || `STU${Date.now()}`,
                    class: className,
                    type,
                    amount,
                    dueDate: new Date(dueDate),
                    status: 'Pending',
                });
                await fee.save();
                return {
                    id: fee._id,
                    studentName: student.name,
                    rollNo: fee.rollNo,
                    class: fee.class,
                    type: fee.type,
                    amount: fee.amount,
                    dueDate: fee.dueDate.toISOString().split('T')[0],
                    status: fee.status,
                };
            })
        );

        res.status(201).json({
            message: `Fee added for ${className} successfully`,
            fees,
        });
    } catch (error) {
        console.error('Add class fee error:', error);
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
            return res.status(403).json({ message: 'Only students can pay fees' });
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

        // For parents, verify they can pay for their child
        if (user.role === 'parent') {
            const student = await User.findById(fee.studentId);
            if (!student || student.parentId?.toString() !== user._id.toString()) {
                return res.status(403).json({ message: 'Unauthorized to pay this fee' });
            }
        }

        fee.status = 'Paid';
        await fee.save();

        const student = await User.findById(fee.studentId);
        const payment = new Payment({
            studentId: fee.studentId,
            studentName: student.name,
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
            payments = await Payment.find().populate('studentId', 'name rollNo').lean();
        } else if (user.role === 'student' || user.role === 'parent') {
            payments = await Payment.find({ studentId: user._id }).populate('studentId', 'name rollNo').lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const formattedPayments = payments.map((payment) => ({
            id: payment._id,
            studentName: payment.studentId?.name || 'Unknown',
            rollNo: payment.studentId?.rollNo || payment.rollNo,
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
            payments = await Payment.find().populate('studentId', 'name rollNo').lean();
        } else if (user.role === 'student' || user.role === 'parent') {
            payments = await Payment.find({ studentId: user._id }).populate('studentId', 'name rollNo').lean();
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
                `Student: ${payment.studentId?.name || 'Unknown'}, Roll No: ${payment.studentId?.rollNo || payment.rollNo}, Date: ${payment.date.toISOString().split('T')[0]}, Type: ${payment.type}, Amount: ₹${payment.amount}, Status: ${payment.status}, Method: ${payment.method}`
            );
            doc.moveDown();
        });
        doc.end();
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};