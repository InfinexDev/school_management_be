const Attendance = require('../models/attendence.model');
const LeaveRequest = require('../models/leaveRequest.model');
const User = require('../models/user.model');
const { sendNotification } = require('../utils/notificationService');

// Get all attendance records
// Get all attendance records
// Get all attendance records
exports.getAttendance = async (req, res) => {
    try {
        const user = req.user;
        let attendance;
        if (user.role === 'teacher' || user.role === 'admin') {
            attendance = await Attendance.find().populate('student', 'name class').lean();
            console.log('Attendance Records:', attendance);
            if (!attendance || attendance.length === 0) {
                console.log('No attendance records found in database');
                const students = await User.find({ role: 'student' }).select('name class').lean();
                console.log('All Students:', students);
                attendance = students.map((student) => ({
                    id: student._id,
                    name: student.name,
                    class: student.class || 'Unknown',
                    status: 'Not Marked',
                    date: new Date().toISOString().split('T')[0],
                }));
            } else {
                // Merge attendance with all students to ensure all students are shown
                const students = await User.find({ role: 'student' }).select('name class').lean();
                const attendanceMap = new Map(attendance.map((record) => [record.student._id.toString(), record]));
                attendance = students.map((student) => {
                    const record = attendanceMap.get(student._id.toString());
                    return record
                        ? {
                            id: record._id,
                            name: student.name,
                            class: student.class || record.class || 'Unknown',
                            status: record.status,
                            date: new Date(record.date).toISOString().split('T')[0],
                        }
                        : {
                            id: student._id,
                            name: student.name,
                            class: student.class || 'Unknown',
                            status: 'Not Marked',
                            date: new Date().toISOString().split('T')[0],
                        };
                });
            }
        } else if (user.role === 'student') {
            attendance = await Attendance.find({ student: user._id }).populate('student', 'name class').lean();
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const formattedAttendance = attendance.map((record) => ({
            id: record._id || record.id,
            name: record.student?.name || record.name || 'Unknown',
            class: record.student?.class || record.class || 'Unknown',
            status: record.status || 'Not Marked',
            date: record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        res.status(200).json({ attendance: formattedAttendance });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Mark attendance
exports.markAttendance = async (req, res) => {
    try {
        const { studentId, status } = req.body;
        const user = req.user;

        if (user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can mark attendance' });
        }
        if (!studentId || !['Present', 'Absent'].includes(status)) {
            return res.status(400).json({ message: 'Invalid student ID or status' });
        }

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        const attendance = new Attendance({
            student: studentId,
            class: student.class || 'Unknown', // Ensure class from User collection
            status,
            date: new Date(),
        });

        await attendance.save();

        if (status === 'Absent') {
            await sendNotification({
                userId: studentId,
                message: `${student.name} marked absent on ${new Date().toISOString().split('T')[0]}`,
                type: 'absence_notification',
            });
        }

        res.status(200).json({
            message: `Attendance marked as ${status}`,
            attendance: {
                id: attendance._id,
                name: student.name,
                class: student.class || 'Unknown',
                status: attendance.status,
                date: attendance.date.toISOString().split('T')[0],
            },
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Submit leave request (Student-only)
exports.submitLeaveRequest = async (req, res) => {
    try {
        const { student, class: className, reason, from, to } = req.body;
        const user = req.user;

        if (user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can submit leave requests' });
        }
        if (!student || !className || !reason || !from || !to) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const leaveRequest = new LeaveRequest({
            student: user._id,
            class: className,
            reason,
            from: new Date(from),
            to: new Date(to),
            status: 'Pending',
        });

        await leaveRequest.save();

        await sendNotification({
            class: className,
            message: `New leave request from ${user.name} for ${className} from ${from} to ${to}`,
            type: 'leave_request',
        });

        res.status(201).json({
            message: 'Leave request submitted successfully',
            leaveRequest: {
                id: leaveRequest._id,
                student: user.name,
                class: leaveRequest.class,
                reason: leaveRequest.reason,
                from: leaveRequest.from.toISOString().split('T')[0],
                to: leaveRequest.to.toISOString().split('T')[0],
                status: leaveRequest.status,
            },
        });
    } catch (error) {
        console.error('Submit leave request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get leave requests
exports.getLeaveRequests = async (req, res) => {
    try {
        const user = req.user;
        let leaveRequests;
        if (user.role === 'teacher' || user.role === 'admin') {
            leaveRequests = await LeaveRequest.find().populate('student', 'name');
        } else if (user.role === 'student') {
            leaveRequests = await LeaveRequest.find({ student: user._id }).populate('student', 'name');
        } else {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const formattedLeaveRequests = leaveRequests.map((request) => ({
            id: request._id,
            student: request.student.name,
            class: request.class,
            reason: request.reason,
            from: request.from.toISOString().split('T')[0],
            to: request.to.toISOString().split('T')[0],
            status: request.status,
        }));
        res.status(200).json({ leaveRequests: formattedLeaveRequests });
    } catch (error) {
        console.error('Get leave requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Approve leave request (Teacher-only)
exports.approveLeaveRequest = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'teacher') {
            return res.status(403).json({ message: 'Only teachers can approve leave requests' });
        }

        const leaveRequest = await LeaveRequest.findById(req.params.id).populate('student', 'name');
        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        leaveRequest.status = 'Approved';
        await leaveRequest.save();

        await sendNotification({
            userId: leaveRequest.student._id,
            message: `Your leave request from ${leaveRequest.from.toISOString().split('T')[0]} to ${leaveRequest.to.toISOString().split('T')[0]} has been approved`,
            type: 'leave_approval',
        });

        res.status(200).json({
            message: 'Leave request approved',
            leaveRequest: {
                id: leaveRequest._id,
                student: leaveRequest.student.name,
                class: leaveRequest.class,
                reason: leaveRequest.reason,
                from: leaveRequest.from.toISOString().split('T')[0],
                to: leaveRequest.to.toISOString().split('T')[0],
                status: leaveRequest.status,
            },
        });
    } catch (error) {
        console.error('Approve leave error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};