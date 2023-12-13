$(function(){
    $('.table-sorted').DataTable({
        paging: false,
        fixedHeader: true
    });

    $('.clickable-row').on('click', function(e){
        e.preventDefault();
        const object = $(this).attr('data-click-object');
        const id = $(this).attr('data-click-id');
        console.log('/'+ object + '/' + id);
        window.location.href='/'+ object + '/' + id;
    });
    $('.table-sorted').show();
    $('.table-sorted-loading').hide();
    $('#exportCSV').click(exportCSV);
});

function exportCSV(e){
    const query = { export:true };
    if ($('#exportCSV').val()){
        query.search = $('#pager-search').val();
    }
    const url = window.location.href + '?' + $.param(query);
    e.preventDefault();
    window.open(url, '_self');
    $(this).blur();
}
