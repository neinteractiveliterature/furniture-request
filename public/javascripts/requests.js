$(function () {
    $('[data-toggle="popover"]').popover();
    $('.collapse-toggle').on('click', toggleItem);
});

function toggleItem(e){
    e.preventDefault();
    const target = $(this).data('target');
    const $target = $(target);
    const $parentRow = $(this).closest('.furniture-parent-row');
    const $parentInput = $parentRow.find('.furniture-item-quantity').first();

    if ($target.hasClass('show')){
        $target.collapse('hide');
        let childVal = 0;
        $target.find('.furniture-item-quantity').each(function(){
            if ($(this).val()){
                childVal += Number($(this).val());
            }
            $(this).val(null);
        });
        $parentInput.val(childVal);
        $parentInput.show();
        $target.find('.furniture-children-row').collapse('hide');

    } else {
        $target.collapse('show');
        $target.find('.furniture-item-quantity').first().val($parentInput.val());
        $target.find('.furniture-item-quantity').show();
        $parentInput.val(null);
        $parentInput.hide();
    }
}
