const PromiseRouter = require('express-promise-router');
const csrf = require('csurf');
const _ = require('underscore');
const funitureHelper = require('../lib/furniture-helper');
const permission = require('../lib/permission');
const async = require('async');

async function list(req, res){
    res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
        ],
        current: 'Furniture'
    };
    const furnitures = await req.models.furniture.list();
    res.locals.furnitures = furnitures || [];
    res.render('furniture/index', { pageTitle: 'Furniture' });
}

async function showNew(req, res){
    res.locals.furniture = {
        name: null,
        description: null,
        max_amount: 10,
        internal: false
    };
    res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
            { url: '/furniture', name: 'Furniture'},
        ],
        current: 'New'
    };

    res.locals.csrfToken = req.csrfToken();
    if (_.has(req.session, 'furnitureData')){
        res.locals.furniture = req.session.furnitureData;
        delete req.session.furnitureData;
    }
    res.render('furniture/new');
}

async function showEdit(req, res){
    const id = req.params.id;
    res.locals.csrfToken = req.csrfToken();


    const furniture = await req.models.furniture.get(id);
    res.locals.furniture = furniture;
    if (_.has(req.session, 'furnitureData')){
        res.locals.furniture = req.session.furnitureData;
        delete req.session.furnitureData;
    }
    res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
            { url: '/furniture', name: 'Furniture'},
        ],
        current: 'Edit: ' + furniture.name
    };

    res.render('furniture/edit');
}

async function create(req, res){
    const furniture = req.body.furniture;

    req.session.furnitureData = furniture;

    try {
        await req.models.furniture.create(furniture);
        delete req.session.furnitureData;
        req.flash('success', 'Created Furniture ' + furniture.name);
        res.redirect('/furniture');
    } catch (err) {
        req.flash('error', err.toString());
        return res.redirect('/furniture/new');
    }
}

async function update(req, res){
    const id = req.params.id;
    const furniture = req.body.furniture;
    req.session.furnitureData = furniture;

    const current = await req.models.furniture.get(id);
    furniture.display_order = current.display_order;

    try {
        await req.models.furniture.update(id, furniture);
        delete req.session.furnitureData;
        req.flash('success', 'Updated Furniture ' + furniture.name);
        res.redirect('/furniture');
    } catch (err) {
        req.flash('error', err.toString());
        return (res.redirect('/furniture/'+id));
    }
}

async function remove(req, res){
    const id = req.params.id;
    await req.models.furniture.delete(id);
    req.flash('success', 'Removed Furniture');
    res.redirect('/furniture');
}

async function sort(req, res){
    const order = req.body.order;
    await async.map(order, async (id, idx) => {
        const furniture = await req.models.furniture.get(id);
        furniture.display_order = idx;
        await req.models.funiture.update(id, furniture);
    });
    res.json({ success: true });
}

const router = PromiseRouter();
router.use(funitureHelper.setSection('furniture'));
router.use(permission('Con Com'));

router.get('/', list);
router.get('/new', csrf(), permission('Hotel Liaison'), showNew);
router.get('/:id', csrf(), permission('Hotel Liaison'), showEdit);

router.post('/', csrf(), permission('Hotel Liaison'), create);

router.put('/sort', permission('Hotel Liaison'), sort);
router.put('/:id', csrf(), permission('Hotel Liaison'), update);

router.delete('/:id', permission('Hotel Liaison'), remove);

module.exports = router;

