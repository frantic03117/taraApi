const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const { 
    create_page_content,
    get_all_page_content,
    get_page_content,
    get_page_section,
    update_page_section,
    add_content_block,
    update_content_block,
    delete_content_block,
    delete_page_section,
    toggle_section_status,
    reorder_sections
} = require("../src/controller/PageContentController");

const router = Router();

// Public routes - Get page content
router.get('/', get_all_page_content);
router.get('/:pageName', get_page_content);
router.get('/section/:id', get_page_section);

// Admin routes - Create page content
router.post('/', Auth('Admin'), create_page_content);

// Admin routes - Update page content
router.put('/section/:id', Auth('Admin'), update_page_section);
router.patch('/section/:id/toggle', Auth('Admin'), toggle_section_status);
router.post('/reorder/:pageName', Auth('Admin'), reorder_sections);

// Admin routes - Manage content blocks
router.post('/section/:id/block', Auth('Admin'), add_content_block);
router.put('/section/:id/block/:blockId', Auth('Admin'), update_content_block);
router.delete('/section/:id/block/:blockId', Auth('Admin'), delete_content_block);

// Admin routes - Delete page content
router.delete('/section/:id', Auth('Admin'), delete_page_section);

module.exports = router;
