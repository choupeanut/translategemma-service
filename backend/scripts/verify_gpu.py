import torch
import sys

def verify_gpu():
    print("Verifying GPU availability...")
    if torch.cuda.is_available():
        print(f"CUDA is available! Device count: {torch.cuda.device_count()}")
        print(f"Current device: {torch.cuda.current_device()}")
        print(f"Device name: {torch.cuda.get_device_name(0)}")
        
        # Test tensor allocation
        try:
            x = torch.tensor([1.0, 2.0]).cuda()
            print("Successfully allocated tensor on GPU:")
            print(x)
            return True
        except Exception as e:
            print(f"Error allocating tensor on GPU: {e}")
            return False
    else:
        print("CUDA is NOT available.")
        return False

if __name__ == "__main__":
    if verify_gpu():
        sys.exit(0)
    else:
        sys.exit(1)
