$(function(){
  $('.table-sorted').DataTable({
    paging: false,
  });

  $('.clickable-row').on('click', function(e){
    e.preventDefault();
    var object = $(this).attr('data-click-object');
    var id = $(this).attr('data-click-id');
    console.log('/'+ object + '/' + id);
    window.location.href='/'+ object + '/' + id;
  });
  $(".table-sorted").show();
  $(".table-sorted-loading").hide();
  $('#exportCSV').click(exportCSV);
  console.log('loaded')
});

function exportCSV(e){
    var query = { export:true };
    if ($('#exportCSV').val()){
        query.search = $('#pager-search').val();
    }
    var url = window.location.href + '?' + $.param(query);
    e.preventDefault();
    window.open(url, '_self');
    $(this).blur();
}
