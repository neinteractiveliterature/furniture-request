$(function () {
    $('#furnitureList').sortable({
        tolerance: 'pointer',
        revert: false,
        placeholder: 'placeholder',
        forcePlaceholderSize: true,
        forceHelperSize: true,
        handle: '.handle',
        axis: 'y',
        stop: function () {
            getOrder($(this));
        }

    });
});

function getOrder($table){
    const order = [];
    $table.find('tr').each(function () {
        order.push($(this).attr('data-click-id'));
    });
    $.ajax({
        url: '/furniture/sort',
        dataType: 'json',
        method: 'POST',
        cache: false,
        data:{
            _method: 'PUT',
            order: order
        },
        success: function(data){
            console.log(data);
        }
    });

}
