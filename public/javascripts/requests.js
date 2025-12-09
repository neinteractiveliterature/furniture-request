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
        $(this).attr('aria-expanded', 'false');
        let childVal = 0;
        $target.find('.furniture-item-quantity').each(function(){
            if ($(this).val()){
                childVal += Number($(this).val());
            }
            $(this).val(null);
        });
        if (childVal){
            $parentInput.val(childVal);
        } else {
            $parentInput.val(null);
        }
        $parentInput.show();
        $target.find('.furniture-children-row').collapse('hide');

    } else {
        $target.collapse('show');
        $(this).attr('aria-expanded', 'true');

        if ($parentInput.val()){
            $target.find('.furniture-item-quantity').first().val(Number($parentInput.val()));
        } else {
            $target.find('.furniture-item-quantity').first().val(null);

        }
        $target.find('.furniture-item-quantity').show();
        $parentInput.val(null);
        $parentInput.hide();
    }
}
