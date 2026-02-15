const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const { 
    create_section, 
    get_sections, 
    get_active_sections,
    get_section, 
    get_section_by_slug,
    update_section, 
    delete_section,
    toggle_section_status
} = require("../src/controller/SectionController");

const router = Router();

// Public routes
router.get('/', get_sections);
router.get('/active', get_active_sections);
router.get('/:id', get_section);
router.get('/slug/:slug', get_section_by_slug);

// Admin only routes
router.post('/', Auth('Admin'), create_section);
router.put('/:id', Auth('Admin'), update_section);
router.delete('/:id', Auth('Admin'), delete_section);
router.patch('/:id/toggle', Auth('Admin'), toggle_section_status);

module.exports = router;
