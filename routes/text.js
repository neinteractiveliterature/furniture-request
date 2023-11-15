const PromiseRouter = require('express-promise-router');
const csrf = require('csurf');
const _ = require('underscore');
const furnitureHelper = require('../lib/furniture-helper');
const permission = require('../lib/permission');

async function list(req, res){
    res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
        ],
        current: 'Texts'
    };
    const texts = await req.models.display_text.list();
    res.locals.texts = texts || [];
    res.render('text/index', { pageTitle: 'Display Texts' });
}

async function showNew(req, res){
    res.locals.text = {
        name: null,
        description: null,
        content:null
    };
    res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
            { url: '/text', name: 'Texts'},
        ],
        current: 'New'
    };

    res.locals.csrfToken = req.csrfToken();
    if (_.has(req.session, 'textData')){
        res.locals.texts = req.session.textData;
        delete req.session.textData;
    }
    res.render('text/new');
}

async function showEdit(req, res){
    const id = req.params.id;
    res.locals.csrfToken = req.csrfToken();


    const text = await req.models.display_text.get(id);
    res.locals.text = text;
    if (_.has(req.session, 'textData')){
        res.locals.text = req.session.textData;
        delete req.session.textData;
    }
    res.locals.breadcrumbs = {
        path: [
            { url: '/', name: 'Home'},
            { url: '/text', name: 'Texts'},
        ],
        current: 'Edit: ' + text.name
    };

    res.render('text/edit');
}

async function create(req, res){
    const text = req.body.text;

    req.session.textData = text;

    try {
        await req.models.display_text.create(text);
        delete req.session.textData;
        req.flash('success', 'Created Text ' + text.name);
        res.redirect('/text');
    } catch (err) {
        req.flash('error', err.toString());
        return res.redirect('/text/new');
    }
}

async function update(req, res){
    const id = req.params.id;
    const text = req.body.text;
    req.session.textData = text;

    const current = await req.models.display_text.get(id);
    text.name = current.name;

    try {
        await req.models.display_text.update(id, text);
        delete req.session.textData;
        req.flash('success', 'Updated Text ' + text.name);
        res.redirect('/text');
    } catch (err) {
        req.flash('error', err.toString());
        return (res.redirect('/text/'+id));
    }
}

const router = PromiseRouter();
router.use(furnitureHelper.setSection('admin'));
router.use(permission('Con Com'));

router.get('/', list);
router.get('/new', csrf(), permission('Hotel Liaison'), showNew);
router.get('/:id', csrf(), permission('Hotel Liaison'), showEdit);

router.post('/', csrf(), permission('Hotel Liaison'), create);

router.put('/:id', csrf(), permission('Hotel Liaison'), update);

module.exports = router;

