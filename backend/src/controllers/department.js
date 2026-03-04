import prisma from '../config/prisma.js';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private (SUPER_ADMIN, ADMIN)
export const getDepartments = async (req, res, next) => {
    try {
        const departments = await prisma.department.findMany({
            include: { hr: true, _count: { select: { employees: true } } }
        });
        res.json(departments);
    } catch (error) {
        next(error);
    }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private (SUPER_ADMIN)
export const createDepartment = async (req, res, next) => {
    const { name } = req.body;
    try {
        const department = await prisma.department.create({
            data: { name }
        });
        res.status(201).json(department);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'A hub with this name already exists in the registry.' });
        }
        next(error);
    }
};

// @desc    Assign HR to department
// @route   PUT /api/departments/:id/hr
// @access  Private (SUPER_ADMIN)
export const assignHr = async (req, res, next) => {
    const { hrId } = req.body;
    try {
        const department = await prisma.department.update({
            where: { id: req.params.id },
            data: { hrId }
        });
        res.json(department);
    } catch (error) {
        next(error);
    }
};
