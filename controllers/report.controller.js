const Report = require('../models/reports.model');
const User = require('../models/user.model');
const PDFDocument = require('pdfkit');

const gradeThresholds = [
    { grade: 'A', min: 85 },
    { grade: 'B', min: 70 },
    { grade: 'C', min: 55 },
    { grade: 'D', min: 40 },
    { grade: 'F', min: 0 },
];

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
            subjectMarks: report.subjectMarks || [],
            overallGrade: report.overallGrade || '',
            attendance: report.attendance || '',
            presentDays: report.presentDays || '',
            leaveDays: report.leaveDays || '',
            leaveReason: report.leaveReason || '',
            assessmentType: report.assessmentType || '',
            term: report.term || '',
            summaryNotes: report.summaryNotes || '',
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
        const { type, studentId, class: className, subjectMarks, attendance, presentDays, leaveDays, leaveReason, assessmentType, term, summaryNotes } = req.body;
        const user = req.user;

        if (user.role !== 'admin' && user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only admin or teacher can generate reports' });
        }
        if (!type || !studentId || !className) {
            return res.status(400).json({ message: 'Type, student, and class are required' });
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

        // Validate based on report type
        const validSubjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Computer Science'];
        if (type === 'Academic' || type === 'Grading') {
            if (!subjectMarks || !Array.isArray(subjectMarks) || subjectMarks.length === 0) {
                return res.status(400).json({ message: 'Subject and marks are required for Academic/Grading report' });
            }
            for (const sm of subjectMarks) {
                if (!validSubjects.includes(sm.subject)) {
                    return res.status(400).json({ message: `Invalid subject: ${sm.subject}` });
                }
                if (isNaN(sm.marks) || sm.marks < 0 || sm.marks > 100) {
                    return res.status(400).json({ message: `Marks for ${sm.subject} must be between 0 and 100` });
                }
            }
            if (!assessmentType || !['Unit Test', 'Mid Term', 'Final Exam'].includes(assessmentType)) {
                return res.status(400).json({ message: 'Valid assessment type is required' });
            }
            if (!term || !['Term 1', 'Term 2', 'Annual'].includes(term)) {
                return res.status(400).json({ message: 'Valid term is required' });
            }
        }
        if (type === 'Attendance') {
            if (!attendance || !presentDays) {
                return res.status(400).json({ message: 'Attendance and present days are required for Attendance report' });
            }
            const attendanceValue = parseFloat(attendance.replace('%', ''));
            if (isNaN(attendanceValue) || attendanceValue < 0 || attendanceValue > 100) {
                return res.status(400).json({ message: 'Attendance must be a percentage between 0 and 100' });
            }
            if (isNaN(presentDays) || presentDays < 0) {
                return res.status(400).json({ message: 'Present days must be a non-negative number' });
            }
        }
        if (type === 'Leave') {
            if (!leaveDays || !leaveReason) {
                return res.status(400).json({ message: 'Leave days and reason are required for Leave report' });
            }
            if (isNaN(leaveDays) || leaveDays < 0) {
                return res.status(400).json({ message: 'Leave days must be a non-negative number' });
            }
        }
        if (type === 'Summary' && summaryNotes && summaryNotes.length > 1000) {
            return res.status(400).json({ message: 'Summary notes cannot exceed 1000 characters' });
        }

        // Calculate overall grade for Grading report
        let overallGrade = null;
        if (type === 'Grading' && subjectMarks) {
            const avgMarks = subjectMarks.reduce((sum, sm) => sum + parseInt(sm.marks), 0) / subjectMarks.length;
            for (const threshold of gradeThresholds) {
                if (avgMarks >= threshold.min) {
                    overallGrade = threshold.grade;
                    break;
                }
            }
        }

        const report = new Report({
            type,
            studentId,
            student: student.name,
            class: className,
            subjectMarks: type === 'Academic' || type === 'Grading' ? subjectMarks : undefined,
            overallGrade: type === 'Grading' ? overallGrade : undefined,
            attendance: type === 'Attendance' ? attendance : undefined,
            presentDays: type === 'Attendance' ? parseInt(presentDays) : undefined,
            leaveDays: type === 'Leave' ? parseInt(leaveDays) : undefined,
            leaveReason: type === 'Leave' ? leaveReason : undefined,
            assessmentType: type === 'Academic' || type === 'Grading' ? assessmentType : undefined,
            term: type === 'Academic' || type === 'Grading' ? term : undefined,
            summaryNotes: type === 'Summary' ? summaryNotes : undefined,
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
                subjectMarks: report.subjectMarks || [],
                overallGrade: report.overallGrade || '',
                attendance: report.attendance || '',
                presentDays: report.presentDays || '',
                leaveDays: report.leaveDays || '',
                leaveReason: report.leaveReason || '',
                assessmentType: report.assessmentType || '',
                term: report.term || '',
                summaryNotes: report.summaryNotes || '',
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
        doc.fontSize(14).fillColor('#1f2937');
        doc.text(`Type: ${report.type}`);
        doc.text(`Student: ${report.studentId?.name || 'Unknown'}`);
        doc.text(`Class: ${report.class}`);
        if (report.type === 'Academic' || report.type === 'Grading') {
            doc.text('Subjects and Marks:');
            report.subjectMarks?.forEach(sm => {
                doc.text(`  ${sm.subject}: ${sm.marks}`);
            });
            if (report.type === 'Grading') {
                doc.text(`Overall Grade: ${report.overallGrade || '-'}`);
            }
            doc.text(`Assessment Type: ${report.assessmentType || '-'}`);
            doc.text(`Term: ${report.term || '-'}`);
        } else if (report.type === 'Attendance') {
            doc.text(`Attendance: ${report.attendance || '-'}`);
            doc.text(`Present Days: ${report.presentDays || '-'}`);
        } else if (report.type === 'Leave') {
            doc.text(`Leave Days: ${report.leaveDays || '-'}`);
            doc.text(`Leave Reason: ${report.leaveReason || '-'}`);
        } else if (report.type === 'Summary') {
            doc.text(`Summary Notes: ${report.summaryNotes || '-'}`);
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