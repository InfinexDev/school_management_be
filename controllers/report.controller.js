const Report = require('../models/reports.model');
const User = require('../models/user.model');
const PDFDocument = require('pdfkit');

// Get all reports
exports.getReports = async (req, res) => {
    try {
        const user = req.user;
        let reports;
        console.log('Fetching reports for user:', user._id, 'Role:', user.role);
        if (user.role === 'admin' || user.role === 'teacher') {
            reports = await Report.find().lean();
        } else if (user.role === 'student') {
            reports = await Report.find({ student: user.name }).lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        console.log('Reports found:', JSON.stringify(reports, null, 2));
        const formattedReports = reports.map((report) => ({
            id: report._id.toString(),
            type: report.type,
            student: report.student,
            class: report.class,
            subject: report.subject || '',
            marks: report.marks || '',
            attendance: report.attendance || '',
            date: report.date.toISOString().split('T')[0],
        }));
        res.status(200).json({ reports: formattedReports });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Generate new report (Admin/Teacher only)
exports.generateReport = async (req, res) => {
    try {
        const { type, student, class: className, subject, marks, attendance } = req.body;
        const user = req.user;

        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only admin or teacher can generate reports' });
        }
        if (!type || !student || !className) {
            return res.status(400).json({ message: 'Type, student, and class are required' });
        }
        if (type === 'Academic' && (!subject || !marks)) {
            return res.status(400).json({ message: 'Subject and marks are required for Academic report' });
        }
        if (type === 'Attendance' && !attendance) {
            return res.status(400).json({ message: 'Attendance is required for Attendance report' });
        }

        const report = new Report({
            type,
            student,
            class: className,
            subject: type === 'Academic' ? subject : undefined,
            marks: type === 'Academic' ? marks : undefined,
            attendance: type === 'Attendance' ? attendance : undefined,
        });

        await report.save();

        res.status(201).json({
            message: 'Report generated successfully',
            report: {
                id: report._id.toString(),
                type: report.type,
                student: report.student,
                class: report.class,
                subject: report.subject || '',
                marks: report.marks || '',
                attendance: report.attendance || '',
                date: report.date.toISOString().split('T')[0],
            },
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Export report as PDF
exports.exportReport = async (req, res) => {
    try {
        const user = req.user;
        const reportId = req.params.id;

        const report = await Report.findById(reportId).lean();
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        if (user.role !== 'admin' && user.role !== 'teacher' && report.student !== user.name) {
            return res.status(403).json({ message: 'Unauthorized access to report' });
        }

        const doc = new PDFDocument();
        const fileName = `report_${reportId}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);
        doc.fontSize(20).text('Report Details', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Type: ${report.type}`);
        doc.text(`Student: ${report.student}`);
        doc.text(`Class: ${report.class}`);
        if (report.type === 'Academic') {
            doc.text(`Subject: ${report.subject || '-'}`);
            doc.text(`Marks: ${report.marks || '-'}`);
        } else {
            doc.text(`Attendance: ${report.attendance || '-'}`);
        }
        doc.text(`Date: ${report.date.toISOString().split('T')[0]}`);
        doc.end();

        res.status(200);
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};