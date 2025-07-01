exports.validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

exports.validatePassword = (password) => {
    return password && password.length >= 6;
};

exports.validateRole = (role) => {
    return ['student', 'teacher', 'admin', 'parent'].includes(role);
};

exports.validateClass = (className) => {
    return className && typeof className === 'string' && className.trim() !== '';
};

exports.validateSubject = (subject) => {
    return subject && typeof subject === 'string' && subject.trim() !== '';
};

exports.validateMaterialType = (type) => {
    return ['PDF', 'Video', 'Assignment'].includes(type);
};

exports.validateTitle = (title) => {
    return title && typeof title === 'string' && title.trim() !== '';
};
