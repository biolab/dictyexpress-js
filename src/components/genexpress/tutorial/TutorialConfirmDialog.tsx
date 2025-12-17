import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from '@mui/material';

interface Props {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const TutorialConfirmDialog = ({ open, onConfirm, onCancel }: Props) => (
    <Dialog open={open} onClose={onCancel}>
        <DialogTitle>Start Tutorial?</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Starting the tutorial will reset all values to their default state. Any changes you
                have made will be discarded.
                <br />
                <br />
                Do you want to continue with the tutorial?
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={onCancel} color="inherit">
                Cancel
            </Button>
            <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
                Start Tutorial
            </Button>
        </DialogActions>
    </Dialog>
);

export default TutorialConfirmDialog;
