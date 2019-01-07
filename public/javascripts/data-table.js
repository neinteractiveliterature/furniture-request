$(function(){
  $('.table-sorted').DataTable({
    paging: false,

  });

  $('.clickable-row').on('click', function(e){
    e.preventDefault();
    var object = $(this).attr('data-click-object');
    var id = $(this).attr('data-click-id');
    window.location.href='/'+ object + '/' + id;
  });
  $(".table-sorted").show();
  $(".table-sorted-loading").hide();
  console.log('loaded')
});
