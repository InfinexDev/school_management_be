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
            reports = await Report.find()
                .populate('studentId', 'name')
                .lean();
        } else if (user.role === 'student') {
            reports = await Report.find({ studentId: user._id })
                .populate('studentId', 'name')
                .lean();
        } else if (user.role === 'parent') {
            const students = await User.find({ parentId: user._id }).select('_id');
            const studentIds = students.map((student) => student._id);
            reports = await Report.find({ studentId: { $in: studentIds } })
                .populate('studentId', 'name')
                .lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        console.log('Reports found:', JSON.stringify(reports, null, 2));
        const formattedReports = reports.map((report) => ({
            id: report._id.toString(),
            type: report.type,
            student: report.studentId?.name || 'Unknown',
            class: report.class,
            subject: report.subject || '',
            marks: report.marks || '',
            attendance: report.attendance || '',
            date: report.date.toISOString().split('T')[0],
        }));

        res.status(200).json({ message: 'Reports retrieved successfully', reports: formattedReports });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Generate new report (Admin/Teacher only)
exports.generateReport = async (req, res) => {
    try {
        const { type, studentId, class: className, subject, marks, attendance } = req.body;
        const user = req.user;

        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only admin or teacher can generate reports' });
        }
        if (!type || !studentId || !className) {
            return res.status(400).json({ message: 'Type, student, and class are required' });
        }
        if (type === 'Academic' && (!subject || !marks)) {
            return res.status(400).json({ message: 'Subject and marks are required for Academic report' });
        }
        if (type === 'Attendance' && !attendance) {
            return res.status(400).json({ message: 'Attendance is required for Attendance report' });
        }

        // Validate studentId
        const student = await User.findById(studentId).select('name class');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Validate class
        const validClasses = [
            'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
            'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
        ];
        if (!validClasses.includes(className)) {
            return res.status(400).json({ message: 'Invalid class' });
        }

        // Validate subject for Academic reports
        if (type === 'Academic') {
            const validSubjects = [
                'Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Computer Science',
            ];
            if (!validSubjects.includes(subject)) {
                return res.status(400).json({ message: 'Invalid subject' });
            }
            if (isNaN(marks) || marks < 0 || marks > 100) {
                return res.status(400).json({ message: 'Marks must be between 0 and 100' });
            }
        }

        // Validate attendance for Attendance reports
        if (type === 'Attendance') {
            const attendanceValue = parseFloat(attendance.replace('%', ''));
            if (isNaN(attendanceValue) || attendanceValue < 0 || attendanceValue > 100) {
                return res.status(400).json({ message: 'Attendance must be a percentage between 0 and 100' });
            }
        }

        const report = new Report({
            type,
            studentId,
            student: student.name,
            class: className,
            subject: type === 'Academic' ? subject : undefined,
            marks: type === 'Academic' ? parseInt(marks) : undefined,
            attendance: type === 'Attendance' ? attendance : undefined,
            date: new Date(),
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

        const report = await Report.findById(reportId).populate('studentId', 'name').lean();
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        if (
            user.role !== 'admin' &&
            user.role !== 'teacher' &&
            report.studentId?._id.toString() !== user._id.toString()
        ) {
            return res.status(403).json({ message: 'Unauthorized access to report' });
        }

        const doc = new PDFDocument({ margin: 50 });
        const fileName = `report_${reportId}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);
        doc.fontSize(20).fillColor('#0f766e').text('Report Details', { align: 'center' });
        doc.moveDown(1.5);
        doc.fontSize(14).fillColor('#1f2937').text(`Type: ${report.type}`);
        doc.text(`Student: ${report.studentId?.name || 'Unknown'}`);
        doc.text(`Class: ${report.class}`);
        if (report.type === 'Academic') {
            doc.text(`Subject: ${report.subject || '-'}`);
            doc.text(`Marks: ${report.marks || '-'}`);
        } else {
            doc.text(`Attendance: ${report.attendance || '-'}`);
        }
        doc.text(`Date: ${new Date(report.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })}`);
        doc.moveDown();
        doc.fontSize(10).fillColor('#6b7280').text('Generated by School Management System', { align: 'center' });
        doc.end();

        res.status(200);
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get students for dropdown
exports.getStudents = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const students = await User.find({ role: 'student' }).select('_id name').lean();
        res.status(200).json({
            message: 'Students retrieved successfully',
            students,
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};